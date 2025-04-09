import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { stocks } from '../stocks';

/**
 * Gera um relatório com estatísticas baseadas nos registros de operações
 * @returns {Promise<Object>} Objeto com os dados do relatório
 */
export const gerarRelatorioGeral = async () => {
  try {
    // Obter todos os produtos de todos os estoques
    const todosProdutos = await obterTodosProdutos();
    
    // Obter registros de operações
    const registros = await obterRegistrosOperacoes();
    
    // Analisar dados para o relatório
    const itensMaisEntradas = calcularItensMaisEntradas(registros);
    const itensMenosEntradas = calcularItensMenosEntradas(registros);
    const itensMaisSaidas = calcularItensMaisSaidas(registros);
    const itensMenosSaidas = calcularItensMenosSaidas(registros);
    const custoTotal = calcularCustoTotal(todosProdutos);
    
    // Analisar variação de fluxo entre meses
    const variacaoFluxo = await analisarVariacaoFluxo();
    
    return {
      itensMaisEntradas,
      itensMenosEntradas,
      itensMaisSaidas,
      itensMenosSaidas,
      custoTotal,
      variacaoFluxo,
      dataGeracao: new Date().toLocaleString('pt-BR'),
      totalProdutos: todosProdutos.length
    };
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    throw error;
  }
};

/**
 * Obtém todos os produtos de todos os estoques
 * @returns {Promise<Array>} Array com todos os produtos
 */
const obterTodosProdutos = async () => {
  try {
    const todosProdutos = [];
    
    // Para cada estoque, buscar todos os produtos
    for (const [estoqueKey, collectionName] of Object.entries(stocks)) {
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      const produtosEstoque = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        estoque: estoqueKey
      }));
      
      todosProdutos.push(...produtosEstoque);
    }
    
    return todosProdutos;
  } catch (error) {
    console.error("Erro ao obter todos os produtos:", error);
    return [];
  }
};

/**
 * Obtém registros de operações (adição, remoção, transferência)
 * @returns {Promise<Array>} Array com registros de operações
 */
const obterRegistrosOperacoes = async () => {
  try {
    const q = query(
      collection(db, 'registros'),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Erro ao obter registros de operações:", error);
    return [];
  }
};

/**
 * Calcula os itens com maior número de entradas
 * @param {Array} registros Registros de operações
 * @returns {Array} Top 5 itens com mais entradas
 */
const calcularItensMaisEntradas = (registros) => {
  // Filtrar apenas operações de adição
  const registrosAdicao = registros.filter(reg => reg.tipoOperacao === 'adicao');
  
  // Agrupar por item e somar quantidades
  const itemsMap = {};
  registrosAdicao.forEach(reg => {
    if (!itemsMap[reg.item]) {
      itemsMap[reg.item] = {
        nome: reg.item,
        quantidade: 0,
        valor: parseFloat(reg.valor || 0)
      };
    }
    itemsMap[reg.item].quantidade += parseInt(reg.quantidade || 0);
  });
  
  // Converter para array e ordenar por quantidade (descendente)
  return Object.values(itemsMap)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5); // Top 5
};

/**
 * Calcula os itens com menor número de entradas
 * @param {Array} registros Registros de operações
 * @returns {Array} Top 5 itens com menos entradas
 */
const calcularItensMenosEntradas = (registros) => {
  // Filtrar apenas operações de adição
  const registrosAdicao = registros.filter(reg => reg.tipoOperacao === 'adicao');
  
  // Agrupar por item e somar quantidades
  const itemsMap = {};
  registrosAdicao.forEach(reg => {
    if (!itemsMap[reg.item]) {
      itemsMap[reg.item] = {
        nome: reg.item,
        quantidade: 0,
        valor: parseFloat(reg.valor || 0)
      };
    }
    itemsMap[reg.item].quantidade += parseInt(reg.quantidade || 0);
  });
  
  // Converter para array e ordenar por quantidade (ascendente)
  return Object.values(itemsMap)
    .sort((a, b) => a.quantidade - b.quantidade)
    .slice(0, 5); // Top 5
};

/**
 * Calcula os itens com maior número de saídas
 * @param {Array} registros Registros de operações
 * @returns {Array} Top 5 itens com mais saídas
 */
const calcularItensMaisSaidas = (registros) => {
  // Filtrar apenas operações de remoção e transferência
  const registrosSaida = registros.filter(reg => 
    reg.tipoOperacao === 'remocao' || reg.tipoOperacao === 'transferencia'
  );
  
  // Agrupar por item e somar quantidades
  const itemsMap = {};
  registrosSaida.forEach(reg => {
    if (!itemsMap[reg.item]) {
      itemsMap[reg.item] = {
        nome: reg.item,
        quantidade: 0,
        valor: parseFloat(reg.valor || 0)
      };
    }
    itemsMap[reg.item].quantidade += parseInt(reg.quantidade || 0);
  });
  
  // Converter para array e ordenar por quantidade (descendente)
  return Object.values(itemsMap)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5); // Top 5
};

/**
 * Calcula os itens com menor número de saídas
 * @param {Array} registros Registros de operações
 * @returns {Array} Top 5 itens com menos saídas
 */
const calcularItensMenosSaidas = (registros) => {
  // Filtrar apenas operações de remoção e transferência
  const registrosSaida = registros.filter(reg => 
    reg.tipoOperacao === 'remocao' || reg.tipoOperacao === 'transferencia'
  );
  
  // Agrupar por item e somar quantidades
  const itemsMap = {};
  registrosSaida.forEach(reg => {
    if (!itemsMap[reg.item]) {
      itemsMap[reg.item] = {
        nome: reg.item,
        quantidade: 0,
        valor: parseFloat(reg.valor || 0)
      };
    }
    itemsMap[reg.item].quantidade += parseInt(reg.quantidade || 0);
  });
  
  // Converter para array e ordenar por quantidade (ascendente)
  return Object.values(itemsMap)
    .sort((a, b) => a.quantidade - b.quantidade)
    .slice(0, 5); // Top 5
};

/**
 * Calcula o custo total do estoque
 * @param {Array} produtos Lista de todos os produtos
 * @returns {number} Custo total
 */
const calcularCustoTotal = (produtos) => {
  return produtos.reduce((total, produto) => {
    const valor = parseFloat(produto.valor || 0);
    const quantidade = parseInt(produto.quantidade || 0);
    return total + (valor * quantidade);
  }, 0);
};

/**
 * Analisa a variação de fluxo de produtos entre o mês atual e o mês anterior
 * @returns {Promise<Object>} Objeto com dados de variação
 */
export const analisarVariacaoFluxo = async () => {
  try {
    // Define as datas para o mês atual e o mês anterior
    const dataAtual = new Date();
    const inicioMesAtual = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    const fimMesAtual = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0, 23, 59, 59);
    
    const inicioMesAnterior = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1, 1);
    const fimMesAnterior = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 0, 23, 59, 59);
    
    // Converter para Timestamp do Firestore
    const inicioMesAtualTimestamp = Timestamp.fromDate(inicioMesAtual);
    const fimMesAtualTimestamp = Timestamp.fromDate(fimMesAtual);
    const inicioMesAnteriorTimestamp = Timestamp.fromDate(inicioMesAnterior);
    const fimMesAnteriorTimestamp = Timestamp.fromDate(fimMesAnterior);
    
    // Obter registros do mês atual
    const registrosMesAtual = await obterRegistrosPorPeriodo(
      inicioMesAtualTimestamp, 
      fimMesAtualTimestamp
    );
    
    // Obter registros do mês anterior
    const registrosMesAnterior = await obterRegistrosPorPeriodo(
      inicioMesAnteriorTimestamp, 
      fimMesAnteriorTimestamp
    );
    
    // Analisar entradas
    const entradasMesAtual = analisarOperacoes(registrosMesAtual, 'adicao');
    const entradasMesAnterior = analisarOperacoes(registrosMesAnterior, 'adicao');
    
    // Analisar saídas
    const saidasMesAtual = analisarOperacoes(registrosMesAtual, ['remocao', 'transferencia']);
    const saidasMesAnterior = analisarOperacoes(registrosMesAnterior, ['remocao', 'transferencia']);
    
    // Calcular variações
    const variacoesEntrada = calcularVariacoes(entradasMesAtual, entradasMesAnterior);
    const variacoesSaida = calcularVariacoes(saidasMesAtual, saidasMesAnterior);
    
    // Formatar nomes dos meses
    const nomeMesAtual = inicioMesAtual.toLocaleString('pt-BR', { month: 'long' });
    const nomeMesAnterior = inicioMesAnterior.toLocaleString('pt-BR', { month: 'long' });
    
    return {
      periodoAtual: {
        inicio: inicioMesAtual.toLocaleDateString('pt-BR'),
        fim: fimMesAtual.toLocaleDateString('pt-BR'),
        nome: nomeMesAtual
      },
      periodoAnterior: {
        inicio: inicioMesAnterior.toLocaleDateString('pt-BR'),
        fim: fimMesAnterior.toLocaleDateString('pt-BR'),
        nome: nomeMesAnterior
      },
      variacoesEntrada,
      variacoesSaida
    };
  } catch (error) {
    console.error("Erro ao analisar variação de fluxo:", error);
    return {
      variacoesEntrada: [],
      variacoesSaida: []
    };
  }
};

/**
 * Obtém registros de operações em um período específico
 * @param {Timestamp} inicio - Data de início
 * @param {Timestamp} fim - Data de fim
 * @returns {Promise<Array>} Registros no período
 */
const obterRegistrosPorPeriodo = async (inicio, fim) => {
  try {
    const q = query(
      collection(db, 'registros'),
      where('timestamp', '>=', inicio),
      where('timestamp', '<=', fim),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Erro ao obter registros por período:", error);
    return [];
  }
};

/**
 * Analisa operações de um tipo específico
 * @param {Array} registros - Registros de operações
 * @param {string|Array} tipoOperacao - Tipo(s) de operação a filtrar
 * @returns {Object} Mapa de item -> quantidade
 */
const analisarOperacoes = (registros, tipoOperacao) => {
  // Converter tipoOperacao para array se for string
  const tipos = Array.isArray(tipoOperacao) ? tipoOperacao : [tipoOperacao];
  
  // Filtrar operações do tipo desejado
  const registrosFiltrados = registros.filter(reg => tipos.includes(reg.tipoOperacao));
  
  // Agrupar por item e somar quantidades
  const itemsMap = {};
  registrosFiltrados.forEach(reg => {
    if (!itemsMap[reg.item]) {
      itemsMap[reg.item] = {
        nome: reg.item,
        quantidade: 0
      };
    }
    itemsMap[reg.item].quantidade += parseInt(reg.quantidade || 0);
  });
  
  return itemsMap;
};

/**
 * Calcula variações entre dois períodos
 * @param {Object} dadosAtual - Dados do período atual
 * @param {Object} dadosAnterior - Dados do período anterior
 * @returns {Array} Lista de itens com variação
 */
const calcularVariacoes = (dadosAtual, dadosAnterior) => {
  const resultado = [];
  
  // Processar todos os itens do período atual
  Object.keys(dadosAtual).forEach(item => {
    const qntAtual = dadosAtual[item].quantidade;
    const qntAnterior = dadosAnterior[item]?.quantidade || 0;
    const variacao = qntAtual - qntAnterior;
    const percentual = qntAnterior === 0 
      ? 100 // Se não havia no mês anterior, é 100% novo
      : ((variacao / qntAnterior) * 100).toFixed(1);
    
    // Adicionar apenas se houver variação
    if (variacao !== 0) {
      resultado.push({
        nome: item,
        quantidadeAtual: qntAtual,
        quantidadeAnterior: qntAnterior,
        variacao,
        percentual: parseFloat(percentual)
      });
    }
  });
  
  // Processar itens que estavam apenas no período anterior
  Object.keys(dadosAnterior).forEach(item => {
    if (!dadosAtual[item]) {
      resultado.push({
        nome: item,
        quantidadeAtual: 0,
        quantidadeAnterior: dadosAnterior[item].quantidade,
        variacao: -dadosAnterior[item].quantidade,
        percentual: -100 // Reduziu 100%
      });
    }
  });
  
  // Ordenar por variação percentual (decrescente)
  return resultado.sort((a, b) => Math.abs(b.percentual) - Math.abs(a.percentual));
};

/**
 * Calcula estatísticas mensais de entrada e saída para cada estoque
 * @returns {Promise<Object>} - Estatísticas de todos os estoques
 */
export const calcularEstatisticasMensais = async () => {
  try {
    // Obter data atual e primeiro dia do mês
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    
    // Converter para Timestamp do Firestore
    const inicioMesTimestamp = Timestamp.fromDate(primeiroDiaMes);
    const fimMesTimestamp = Timestamp.fromDate(ultimoDiaMes);
    
    // Obter registros do mês atual
    const registrosMes = await obterRegistrosPorPeriodo(
      inicioMesTimestamp, 
      fimMesTimestamp
    );
    
    // Obter todos os produtos de todos os estoques
    const todosProdutos = await obterTodosProdutos();
    
    // Agrupar produtos por estoque
    const produtosPorEstoque = {
      "Estoque Principal": todosProdutos.filter(p => p.colecao === "estoque-principal"),
      "Estoque Veterinário": todosProdutos.filter(p => p.colecao === "estoque-vet"),
      "Reposição de Consultórios": todosProdutos.filter(p => p.colecao === "reposicao-consultorios"),
      "Internação": todosProdutos.filter(p => p.colecao === "internacao")
    };
    
    // Inicializar estatísticas para cada estoque
    const estatisticas = {};
    
    // Para cada estoque, calcular estatísticas
    for (const [nomeEstoque, produtos] of Object.entries(produtosPorEstoque)) {
      // Filtrar registros para este estoque
      const registrosEstoque = registrosMes.filter(reg => reg.origem === nomeEstoque || reg.destino === nomeEstoque);
      
      // Entradas: operações de adição e recebimento de transferências
      const entradasRegistros = registrosEstoque.filter(reg => 
        (reg.tipoOperacao === 'adicao' && reg.origem === nomeEstoque) || 
        (reg.tipoOperacao === 'transferencia' && reg.destino === nomeEstoque)
      );
      
      // Saídas: operações de remoção e envio de transferências
      const saidasRegistros = registrosEstoque.filter(reg => 
        (reg.tipoOperacao === 'remocao' && reg.origem === nomeEstoque) || 
        (reg.tipoOperacao === 'transferencia' && reg.origem === nomeEstoque)
      );
      
      // Agrupar entradas e saídas por produto
      const entradasPorProduto = {};
      const saidasPorProduto = {};
      
      // Processar entradas
      entradasRegistros.forEach(reg => {
        if (!entradasPorProduto[reg.item]) {
          entradasPorProduto[reg.item] = {
            quantidade: 0,
            operacoes: 0
          };
        }
        entradasPorProduto[reg.item].quantidade += (reg.quantidade || 0);
        entradasPorProduto[reg.item].operacoes += 1;
      });
      
      // Processar saídas
      saidasRegistros.forEach(reg => {
        if (!saidasPorProduto[reg.item]) {
          saidasPorProduto[reg.item] = {
            quantidade: 0,
            operacoes: 0
          };
        }
        saidasPorProduto[reg.item].quantidade += (reg.quantidade || 0);
        saidasPorProduto[reg.item].operacoes += 1;
      });
      
      // Calcular métricas agregadas
      const totalProdutos = produtos.length;
      const totalEntradas = entradasRegistros.reduce((sum, reg) => sum + (reg.quantidade || 0), 0);
      const totalSaidas = saidasRegistros.reduce((sum, reg) => sum + (reg.quantidade || 0), 0);
      const totalOperacoesEntrada = entradasRegistros.length;
      const totalOperacoesSaida = saidasRegistros.length;
      
      // Calcular média diária (considerando dias úteis = 22 dias no mês)
      const diasUteisMes = 22;
      const mediaEntradaDiaria = totalEntradas / diasUteisMes;
      const mediaSaidaDiaria = totalSaidas / diasUteisMes;
      
      // Guardar estatísticas deste estoque
      estatisticas[nomeEstoque] = {
        periodo: {
          inicio: primeiroDiaMes.toLocaleDateString('pt-BR'),
          fim: hoje.toLocaleDateString('pt-BR'),
          mesAno: primeiroDiaMes.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
        },
        totais: {
          produtos: totalProdutos,
          entradas: totalEntradas,
          saidas: totalSaidas,
          operacoesEntrada: totalOperacoesEntrada,
          operacoesSaida: totalOperacoesSaida,
          saldoMes: totalEntradas - totalSaidas
        },
        medias: {
          entradaDiaria: Number(mediaEntradaDiaria.toFixed(2)),
          saidaDiaria: Number(mediaSaidaDiaria.toFixed(2))
        },
        produtosComMaisEntrada: Object.entries(entradasPorProduto)
          .sort((a, b) => b[1].quantidade - a[1].quantidade)
          .slice(0, 5)
          .map(([nome, dados]) => ({
            nome,
            quantidade: dados.quantidade,
            operacoes: dados.operacoes
          })),
        produtosComMaisSaida: Object.entries(saidasPorProduto)
          .sort((a, b) => b[1].quantidade - a[1].quantidade)
          .slice(0, 5)
          .map(([nome, dados]) => ({
            nome,
            quantidade: dados.quantidade,
            operacoes: dados.operacoes
          }))
      };
    }
    
    return {
      dataAtualizacao: new Date().toISOString(),
      mesReferencia: primeiroDiaMes.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
      estoques: estatisticas
    };
    
  } catch (error) {
    console.error("Erro ao calcular estatísticas mensais:", error);
    return {
      error: error.message,
      estoques: {}
    };
  }
}; 