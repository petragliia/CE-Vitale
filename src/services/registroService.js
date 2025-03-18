import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const COLLECTION_NAME = 'registros';

/**
 * Registra uma operação no sistema
 * @param {string} usuarioEmail - Email do usuário que realizou a operação
 * @param {string} tipoOperacao - Tipo de operação (adição, remoção, transferência, etc)
 * @param {string} item - Item envolvido na operação
 * @param {string} origem - Estoque ou local de origem
 * @param {string} destino - Estoque ou local de destino (opcional, para transferências)
 * @param {number} quantidade - Quantidade envolvida na operação (opcional)
 * @param {Object} detalhesAdicionais - Outros detalhes relevantes (opcional)
 * @returns {Promise} - Promise com o resultado da operação
 */
export const registrarOperacao = async (
  usuarioEmail,
  tipoOperacao,
  item,
  origem,
  destino = null,
  quantidade = null,
  detalhesAdicionais = {}
) => {
  try {
    const registro = {
      usuarioEmail,
      tipoOperacao,
      item,
      origem,
      destino,
      quantidade,
      ...detalhesAdicionais,
      timestamp: serverTimestamp(),
      dataFormatada: new Date().toLocaleString('pt-BR')
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), registro);
    console.log('Registro salvo com ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Erro ao registrar operação:', error);
    return { success: false, error };
  }
};

/**
 * Obtém os registros de operações
 * @param {number} limite - Limite de registros a serem retornados
 * @returns {Promise<Array>} - Promise com array de registros
 */
export const obterRegistros = async (limite = 100) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('timestamp', 'desc'),
      limit(limite)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao obter registros:', error);
    return [];
  }
};

/**
 * Formatadores de mensagens para diferentes tipos de operações
 */
export const formatarMensagem = {
  adicao: (registro) => 
    `${registro.usuarioEmail} adicionou ${registro.quantidade} ${registro.item} no ${registro.origem} às ${registro.dataFormatada.split(' ')[1]}.`,
  
  remocao: (registro) => 
    `${registro.usuarioEmail} removeu ${registro.quantidade || ''} ${registro.item} do ${registro.origem} às ${registro.dataFormatada.split(' ')[1]}.`,
  
  transferencia: (registro) => 
    `${registro.usuarioEmail} transferiu ${registro.quantidade} ${registro.item} do ${registro.origem} para o ${registro.destino} às ${registro.dataFormatada.split(' ')[1]}.`,
  
  atualizacao: (registro) => 
    `${registro.usuarioEmail} atualizou ${registro.item} no ${registro.origem} às ${registro.dataFormatada.split(' ')[1]}.`,
  
  login: (registro) => 
    `${registro.usuarioEmail} fez login no sistema às ${registro.dataFormatada.split(' ')[1]}.`,
  
  logout: (registro) => 
    `${registro.usuarioEmail} saiu do sistema às ${registro.dataFormatada.split(' ')[1]}.`,
  
  // Função genérica para outros tipos de operações
  default: (registro) => 
    `${registro.usuarioEmail} realizou operação ${registro.tipoOperacao} com ${registro.item} em ${registro.origem} às ${registro.dataFormatada.split(' ')[1]}.`
}; 