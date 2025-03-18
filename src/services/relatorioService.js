import { collection, getDocs, query, orderBy } from 'firebase/firestore';
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
    
    return {
      itensMaisEntradas,
      itensMenosEntradas,
      itensMaisSaidas,
      itensMenosSaidas,
      custoTotal,
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