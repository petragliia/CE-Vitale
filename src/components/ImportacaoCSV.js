import React, { useState } from "react";
import { Upload, Button, notification, Modal, Select, Table, Progress } from "antd";
import { FileExcelOutlined, CheckCircleOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { stocks } from "../stocks";
import { useAuth } from "../context/AuthContext";
import { registrarOperacao } from "../services/registroService";
import Papa from "papaparse";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import "./ReposicaoConsultorios.css";

const { Option } = Select;
const { Dragger } = Upload;

function ImportacaoCSV() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mappingVisible, setMappingVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [mapping, setMapping] = useState({});
  const [targetCollection, setTargetCollection] = useState(stocks.reposicao);
  const [progress, setProgress] = useState(0);
  const [importing, setImporting] = useState(false);

  // Campos necessários para o sistema
  const requiredFields = [
    { label: "Nome do Produto", value: "nome" },
    { label: "Quantidade", value: "quantidade" },
    { label: "Categoria", value: "categoria" },
    { label: "Valor Unitário", value: "valor" },
    { label: "Validade", value: "validade" },
    { label: "Fornecedor", value: "fornecedor" },
    { label: "Lote", value: "lote" }
  ];

  // Função para analisar o CSV quando o arquivo for selecionado
  const beforeUpload = (file) => {
    const isCSV = file.type === "text/csv" || file.name.endsWith(".csv");
    
    if (!isCSV) {
      notification.error({
        message: "Formato inválido",
        description: "Por favor, selecione um arquivo CSV."
      });
      return Upload.LIST_IGNORE;
    }

    setLoading(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";", // Configurando delimitador como ponto-e-vírgula
      transformHeader: (header) => {
        // Removendo espaços extras e caracteres indesejados dos cabeçalhos
        return header ? header.trim() : header;
      },
      complete: (results) => {
        setLoading(false);
        if (results.data && results.data.length > 0) {
          // Filtrar linhas vazias ou com todos os campos vazios
          const filteredData = results.data.filter(row => {
            // Verificar se pelo menos uma propriedade tem valor
            return Object.values(row).some(value => value && value.trim() !== "");
          });
          
          setCsvData(filteredData);
          setHeaders(results.meta.fields || []);
          setMappingVisible(true);
          
          // Tentativa de mapear automaticamente
          const initialMapping = {};
          results.meta.fields.forEach(field => {
            // Tenta mapear por similaridade de nome
            const lowerField = field.toLowerCase();
            if (lowerField.includes("nome") || lowerField.includes("produto")) {
              initialMapping.nome = field;
            } else if (lowerField.includes("qtd") || lowerField.includes("quantidade") || lowerField === "qtde") {
              initialMapping.quantidade = field;
            } else if (lowerField.includes("categ")) {
              initialMapping.categoria = field;
            } else if (lowerField.includes("valor") || lowerField.includes("preco")) {
              initialMapping.valor = field;
            } else if (lowerField.includes("valid") || lowerField.includes("venc")) {
              initialMapping.validade = field;
            } else if (lowerField.includes("fornec")) {
              initialMapping.fornecedor = field;
            } else if (lowerField.includes("lote")) {
              initialMapping.lote = field;
            }
          });
          
          // Para o arquivo específico "Estoque Geral - Rafacopia1.csv"
          if (file.name.includes("Rafacopia")) {
            initialMapping.nome = "Nome dos produtos";
            initialMapping.quantidade = "Qtde";
            initialMapping.fornecedor = "Fornecedores";
            // Os outros campos podem não existir no formato esperado
          }
          
          setMapping(initialMapping);
        } else {
          notification.error({
            message: "Arquivo vazio",
            description: "O arquivo CSV não contém dados."
          });
        }
      },
      error: (error) => {
        setLoading(false);
        notification.error({
          message: "Erro na análise",
          description: `Erro ao analisar o arquivo CSV: ${error.message}`
        });
      }
    });

    return false; // Não faça o upload automático
  };

  // Função para converter os dados do CSV para o formato do sistema
  const convertData = (data) => {
    // Verifica se estamos processando o arquivo Estoque Geral - Rafacopia
    const isEstoqueGeral = data.length > 0 && data[0]["Nome dos produtos"] !== undefined;
    
    return data.map(item => {
      // Para o arquivo específico Estoque Geral, temos uma estrutura diferente
      if (isEstoqueGeral) {
        // Identificar os campos corretos no arquivo Estoque Geral
        const nome = item["Nome dos produtos"] || "";
        const fornecedor = item["Fornecedores"] || "";
        const quantidade = parseFloat(item["Qtde"] || "0") || 0;
        const un = item["Un."] || "";
        
        // Verifica se a linha é válida (tem nome de produto)
        if (!nome || nome.trim() === "") {
          return null; // Esta linha será filtrada depois
        }
        
        return {
          nome: nome,
          quantidade: quantidade,
          categoria: "Importado de Estoque Geral",
          valor: 0, // Valor não disponível no arquivo
          fornecedor: fornecedor,
          lote: "", // Lote não disponível no arquivo
          unidade: un,
          userId: currentUser?.uid || "",
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } else {
        // Processamento normal para outros arquivos CSV
        const converted = {
          nome: item[mapping.nome] || "",
          quantidade: parseFloat(item[mapping.quantidade]) || 0,
          categoria: item[mapping.categoria] || "Insumos",
          valor: parseFloat(item[mapping.valor]) || 0,
          fornecedor: item[mapping.fornecedor] || "",
          lote: item[mapping.lote] || "",
          userId: currentUser?.uid || "",
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Tenta converter a data de validade
        if (mapping.validade && item[mapping.validade]) {
          try {
            // Tenta formatos comuns de data
            const dateFormats = [
              "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", 
              "DD-MM-YYYY", "MM-DD-YYYY", "DD.MM.YYYY", "MM.DD.YYYY"
            ];
            
            let validDate = null;
            for (let format of dateFormats) {
              const parsed = moment(item[mapping.validade], format);
              if (parsed.isValid()) {
                validDate = parsed.toDate();
                break;
              }
            }
            
            if (validDate) {
              converted.validade = validDate;
            } else {
              // Verifica se é um número (possivelmente um valor de célula Excel)
              if (!isNaN(item[mapping.validade])) {
                // Valor Excel para data (dias desde 1/1/1900)
                const excelEpoch = new Date(1900, 0, 1);
                excelEpoch.setDate(excelEpoch.getDate() + parseInt(item[mapping.validade]) - 2); // O Excel tem bug com datas antes de março/1900
                converted.validade = excelEpoch;
              }
            }
          } catch (e) {
            console.error("Erro ao converter data:", e);
          }
        }

        return converted;
      }
    }).filter(item => item !== null); // Filtra itens nulos (linhas inválidas)
  };

  // Visualização prévia dos dados convertidos
  const handlePreview = () => {
    setMappingVisible(false);
    setPreviewVisible(true);
  };

  // Importação de dados para o Firestore
  const importData = async () => {
    if (!currentUser) {
      notification.error({
        message: "Erro de autenticação",
        description: "Você precisa estar logado para importar dados."
      });
      return;
    }

    setImporting(true);
    setLoading(true);
    setProgress(0);
    
    try {
      const convertedData = convertData(csvData);
      let count = 0;
      
      // Verifica se é o arquivo Estoque Geral
      const isEstoqueGeral = csvData.length > 0 && csvData[0]["Nome dos produtos"] !== undefined;
      
      // Notificação de início
      notification.info({
        message: "Importação iniciada",
        description: `Importando ${convertedData.length} produtos...`,
        duration: 3
      });
      
      for (const item of convertedData) {
        // Ignorar itens sem nome
        if (!item.nome || item.nome.trim() === "") {
          count++;
          setProgress(Math.round((count / convertedData.length) * 100));
          continue;
        }
        
        // Adicionar documento ao Firestore
        await addDoc(collection(db, targetCollection), item);
        
        // Registrar a operação de adição
        await registrarOperacao(
          currentUser.email,
          'adicao',
          item.nome,
          targetCollection === stocks.reposicao ? 'Reposição de Consultórios' :
          targetCollection === stocks.principal ? 'Estoque Principal' :
          targetCollection === stocks.vet ? 'Estoque Veterinário' :
          'Internação',
          null,
          item.quantidade,
          { 
            valorUnitario: item.valor,
            isImportacao: true, 
            arquivo: isEstoqueGeral ? "Estoque Geral" : "CSV padrão",
            unidade: item.unidade || ""
          }
        );
        
        count++;
        setProgress(Math.round((count / convertedData.length) * 100));
        
        // Atualizar progresso a cada 10 itens para não sobrecarregar a renderização
        if (count % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Pequena pausa para não bloquear a UI
        }
      }
      
      notification.success({
        message: "Importação concluída",
        description: `${count} produtos foram importados com sucesso!`,
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />
      });
      
      setPreviewVisible(false);
      setCsvData([]);
      setHeaders([]);
      setMapping({});
    } catch (error) {
      notification.error({
        message: "Erro na importação",
        description: `Erro ao importar dados: ${error.message}`,
        duration: 0 // Mostrar até que o usuário feche
      });
      console.error("Erro na importação:", error);
    } finally {
      setImporting(false);
      setLoading(false);
    }
  };

  // Colunas para a tabela de visualização prévia
  const previewColumns = [
    { title: "Nome", dataIndex: "nome", key: "nome" },
    { title: "Quantidade", dataIndex: "quantidade", key: "quantidade" },
    { title: "Categoria", dataIndex: "categoria", key: "categoria" },
    { title: "Valor", dataIndex: "valor", key: "valor", render: val => `R$ ${val.toFixed(2)}` },
    { 
      title: "Validade", 
      dataIndex: "validade", 
      key: "validade",
      render: val => val ? moment(val).format("DD/MM/YYYY") : "-"
    },
    { title: "Fornecedor", dataIndex: "fornecedor", key: "fornecedor" },
    { title: "Lote", dataIndex: "lote", key: "lote" }
  ];

  return (
    <div className="estoque-container">
      <div className="header-container">
        <Button 
          type="primary" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate("/dashboard")}
          style={{ marginRight: '20px' }}
          className="btn-padrao"
        >
          Voltar
        </Button>
        <h1 className="titulo-estoque">Importação de Dados CSV</h1>
      </div>
      
      <div className="card-container" style={{ gridTemplateColumns: "1fr" }}>
        <div className="card">
          <h3>Selecione o arquivo CSV</h3>
          <p style={{ marginBottom: "20px" }}>
            Selecione um arquivo CSV exportado do Excel para importar para o sistema.
          </p>
          
          <Select
            style={{ width: "100%", marginBottom: "20px" }}
            placeholder="Selecione o estoque de destino"
            value={targetCollection}
            onChange={setTargetCollection}
          >
            <Option value={stocks.reposicao || ''}>Reposição de Consultórios</Option>
            <Option value={stocks.principal || ''}>Estoque Principal</Option>
            <Option value={stocks.vet || ''}>Estoque Veterinário</Option>
            <Option value={stocks.internacao || ''}>Internação</Option>
          </Select>
          
          <Dragger
            accept=".csv"
            beforeUpload={beforeUpload}
            showUploadList={false}
            disabled={loading}
            multiple={false}
            name="arquivoCSV"
            id="importacao-csv"
            className={loading ? "dragger-loading" : ""}
            style={{ padding: "30px 20px" }}
          >
            <p className="ant-upload-drag-icon">
              <FileExcelOutlined style={{ fontSize: "48px", color: loading ? "#d9d9d9" : "#52c41a" }} />
            </p>
            <p className="ant-upload-text">{loading ? "Processando arquivo..." : "Clique ou arraste um arquivo CSV para importar"}</p>
            <p className="ant-upload-hint">
              {loading ? "Aguarde enquanto processamos seu arquivo." : "O arquivo deve estar no formato CSV e conter os campos necessários."}
            </p>
            {loading && <Progress percent={30} status="active" style={{ marginTop: '20px' }} />}
          </Dragger>
        </div>
      </div>

      {/* Modal para mapear campos do CSV */}
      <Modal
        title="Mapear Campos"
        open={mappingVisible}
        onOk={handlePreview}
        onCancel={() => setMappingVisible(false)}
        width={700}
        okText="Visualizar Dados"
        cancelText="Cancelar"
      >
        <p>Por favor, mapeie os campos do seu arquivo CSV para os campos do sistema:</p>
        
        {requiredFields.map(field => (
          <div key={field.value} style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              {field.label}:
            </label>
            <Select
              style={{ width: "100%" }}
              placeholder={`Selecione o campo para ${field.label}`}
              value={mapping[field.value]}
              onChange={value => setMapping({...mapping, [field.value]: value})}
            >
              {headers
                .filter(header => header !== null && header !== undefined)
                .map(header => (
                  <Option key={header || 'empty'} value={header || ''}>
                    {header || '(Sem nome)'}
                  </Option>
                ))}
            </Select>
          </div>
        ))}
      </Modal>

      {/* Modal para visualização prévia dos dados */}
      <Modal
        title="Visualização de Dados"
        open={previewVisible}
        onOk={importData}
        onCancel={() => setPreviewVisible(false)}
        width={900}
        okText="Importar Dados"
        cancelText="Cancelar"
        okButtonProps={{ loading: importing }}
      >
        {csvData.length > 0 && csvData[0]["Nome dos produtos"] !== undefined ? (
          <div>
            <p style={{ fontWeight: "bold", color: "#1890ff" }}>
              Arquivo Estoque Geral - Rafacopia detectado!
            </p>
            <p>
              Este arquivo tem um formato especial e será importado com as seguintes considerações:
            </p>
            <ul>
              <li>Nome do produto: coluna &quot;Nome dos produtos&quot;</li>
              <li>Quantidade: coluna &quot;Qtde&quot;</li>
              <li>Fornecedor: coluna &quot;Fornecedores&quot;</li>
              <li>Unidade: coluna &quot;Un.&quot;</li>
              <li>Categoria padrão: &quot;Importado de Estoque Geral&quot;</li>
              <li>Os itens sem nome serão ignorados</li>
            </ul>
          </div>
        ) : (
          <p>Verifique se os dados abaixo estão corretos antes de importar:</p>
        )}
        
        {importing && (
          <div style={{ marginBottom: "20px" }}>
            <Progress percent={progress} status="active" />
          </div>
        )}
        
        <Table
          columns={previewColumns}
          dataSource={convertData(csvData).slice(0, 10).map((item, index) => ({ ...item, key: index }))}
          size="small"
          pagination={false}
          scroll={{ x: 800 }}
          footer={() => csvData.length > 10 ? `Mostrando 10 de ${csvData.length} registros` : null}
        />
      </Modal>
    </div>
  );
}

export default ImportacaoCSV; 