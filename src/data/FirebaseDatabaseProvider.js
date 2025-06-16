// Importa a classe base DatabaseProvider
const DatabaseProvider = require('./DatabaseProvider');
// Para testes com emulador (quando disponível)
let connectToEmulator;
try {
  connectToEmulator = require('../config/firebaseEmulator').connectToEmulator;
} catch (error) {
  connectToEmulator = () => false;
}

/**
 * Implementação Firebase do DatabaseProvider 
 * Usa o Firestore do Firebase para operações de banco de dados
 */
class FirebaseDatabaseProvider extends DatabaseProvider {
  constructor() {
    super();
    this.db = null;
    this.initializeFirebase();
  }
  
  /**
   * Inicializa a conexão com o Firebase
   * @private
   */
  async initializeFirebase() {
    try {
      // Tenta importar o Firebase
      const firebase = require('firebase/app');
      require('firebase/firestore');
      
      // Verifica se já está inicializado
      if (!firebase.apps.length) {
        firebase.initializeApp({
          projectId: 'vitale-teste-local',
          // Outras configurações podem ser necessárias
        });
      }
      
      this.db = firebase.firestore();
      
      // Conectar ao emulador se estiver em ambiente de teste
      if (process.env.NODE_ENV === 'test') {
        connectToEmulator(firebase);
      }
    } catch (error) {
      console.log('Erro ao inicializar Firebase:', error.message);
      // Cria um mock básico para testes se não conseguir inicializar
      this.db = this.createMockFirestore();
    }
  }
  
  /**
   * Cria um mock básico do Firestore para testes
   * @private
   * @returns {Object} Mock do Firestore
   */
  createMockFirestore() {
    // Armazena dados em memória para o mock
    const mockData = new Map();
    
    return {
      collection: (collectionName) => {
        if (!mockData.has(collectionName)) {
          mockData.set(collectionName, new Map());
        }
        
        const collection = mockData.get(collectionName);
        
        return {
          add: (data) => {
            const id = 'mock-id-' + Date.now();
            collection.set(id, { ...data, id });
            return Promise.resolve({ id });
          },
          doc: (id) => ({
            get: () => {
              const doc = collection.get(id);
              return Promise.resolve({
                exists: !!doc,
                id,
                data: () => doc || null
              });
            },
            set: (data) => {
              collection.set(id, { ...data, id });
              return Promise.resolve();
            },
            update: (data) => {
              const existing = collection.get(id) || {};
              collection.set(id, { ...existing, ...data, id });
              return Promise.resolve();
            },
            delete: () => {
              collection.delete(id);
              return Promise.resolve();
            }
          }),
          where: () => ({
            get: () => Promise.resolve({
              docs: [],
              forEach: (callback) => {}
            })
          }),
          get: () => {
            const docs = [];
            collection.forEach((value, key) => {
              docs.push({
                id: key,
                data: () => value
              });
            });
            return Promise.resolve({
              docs,
              forEach: (callback) => {
                docs.forEach(callback);
              }
            });
          }
        };
      }
    };
  }

  /**
   * Cria um novo registro no Firestore
   * @param {string} collection - Nome da coleção
   * @param {Object} data - Dados a serem inseridos
   * @returns {Promise<Object>} - Objeto criado com ID
   */
  async create(collection, data) {
    // Opção 1: Firebase gera o ID
    const docRef = await this.db.collection(collection).add(data);
    return {
      id: docRef.id,
      ...data
    };
    
    // Opção 2: Para usar um ID personalizado (descomente se necessário)
    // const id = data.id || this.db.collection(collection).doc().id;
    // await this.db.collection(collection).doc(id).set(data);
    // return { id, ...data };
  }

  /**
   * Busca um documento pelo ID no Firestore
   * @param {string} collection - Nome da coleção
   * @param {string} id - ID do documento
   * @returns {Promise<Object|null>} - Documento encontrado ou null
   */
  async findById(collection, id) {
    const docRef = await this.db.collection(collection).doc(id).get();
    
    if (!docRef.exists) {
      return null;
    }
    
    return {
      id: docRef.id,
      ...docRef.data()
    };
  }

  /**
   * Busca documentos com base em filtros
   * @param {string} collection - Nome da coleção
   * @param {Object} filters - Filtros a serem aplicados
   * @returns {Promise<Array>} - Array de documentos encontrados
   */
  async find(collection, filters = {}) {
    let query = this.db.collection(collection);
    
    // Aplicar cada filtro à query
    Object.entries(filters).forEach(([field, value]) => {
      query = query.where(field, '==', value);
    });
    
    const snapshot = await query.get();
    const results = [];
    
    snapshot.forEach(doc => {
      results.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return results;
  }

  /**
   * Lista todos os documentos de uma coleção
   * @param {string} collection - Nome da coleção
   * @returns {Promise<Array>} - Array com todos os documentos
   */
  async findAll(collection) {
    const snapshot = await this.db.collection(collection).get();
    const results = [];
    
    snapshot.forEach(doc => {
      results.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return results;
  }

  /**
   * Atualiza um documento
   * @param {string} collection - Nome da coleção
   * @param {string} id - ID do documento
   * @param {Object} data - Dados para atualização
   * @returns {Promise<boolean>} - true se bem sucedido
   */
  async update(collection, id, data) {
    await this.db.collection(collection).doc(id).update(data);
    return true;
  }

  /**
   * Remove um documento
   * @param {string} collection - Nome da coleção
   * @param {string} id - ID do documento
   * @returns {Promise<boolean>} - true se bem sucedido
   */
  async delete(collection, id) {
    await this.db.collection(collection).doc(id).delete();
    return true;
  }
  
  /**
   * Inicia uma transação no Firestore
   * @returns {Promise<Object>} - Objeto de transação
   */
  async beginTransaction() {
    return this.db.runTransaction(transaction => {
      return Promise.resolve(transaction);
    });
  }
  
  /**
   * No Firebase as transações são gerenciadas automaticamente
   * Este método existe apenas para compatibilidade com a interface
   */
  async commitTransaction(transaction) {
    // No Firestore as transações são confirmadas automaticamente
    return Promise.resolve();
  }
  
  /**
   * No Firebase as transações são revertidas automaticamente em caso de erro
   * Este método existe apenas para compatibilidade com a interface
   */
  async rollbackTransaction(transaction) {
    // No Firestore as transações são revertidas automaticamente
    return Promise.resolve();
  }
}

export default FirebaseDatabaseProvider;
