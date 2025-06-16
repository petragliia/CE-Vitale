const mysql = require('mysql2/promise');
const databaseFactory = require('../data/DatabaseFactory');
const FirebaseDatabaseProvider = require('../data/FirebaseDatabaseProvider');
const MySQLDatabaseProvider = require('../data/MySQLDatabaseProvider');

/**
 * Configuração para ambiente de testes
 * Detecta automaticamente se o MySQL está disponível e usa a implementação apropriada
 */

// Configuração de conexão MySQL para testes
const dbConfig = {
  host: 'localhost',
  user: 'root', // Substituir pelo seu usuário
  password: '', // Substituir pela sua senha
  database: 'vitale_test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

/**
 * Tenta inicializar o provedor MySQL, se não for possível, usa Firebase
 */
async function setupTestDatabase() {
  // Tenta conectar ao MySQL
  try {
    console.log('Tentando conectar ao MySQL...');
    const tempPool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      connectTimeout: 3000 // Timeout rápido para testes
    });
    
    // Tenta executar uma query simples para verificar a conexão
    await tempPool.query('SELECT 1');
    console.log('MySQL está disponível, usando-o para testes');
    
    // Cria o banco de dados de teste se não existir
    await tempPool.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    
    // Fecha a conexão temporária
    await tempPool.end();
    
    // Cria pool do banco de testes
    const testPool = mysql.createPool(dbConfig);
    
    // Define o provedor para MySQL
    const mysqlProvider = new MySQLDatabaseProvider(testPool);
    databaseFactory.setProvider(mysqlProvider);
    
    // Retorna o pool para uso em testes diretos
    return { 
      dbType: 'mysql', 
      dbPool: testPool,
      dbProvider: mysqlProvider 
    };
  } catch (error) {
    console.log('MySQL não está disponível, usando Firebase Emulator para testes');
    console.log(`Motivo: ${error.message || 'Desconhecido'}`);
    
    try {
      // Cria um mock do Firebase com um banco de dados em memória
      const mockDb = {
        collections: {}
      };
      
      const mockProvider = {
        // Cria um documento em uma coleção
        create: (collection, data) => {
          if (!mockDb.collections[collection]) {
            mockDb.collections[collection] = {};
          }
          const id = data.id || 'mock-id-' + Date.now();
          const newItem = { id, ...data };
          mockDb.collections[collection][id] = newItem;
          return Promise.resolve(newItem);
        },
        
        // Busca um documento por ID
        findById: (collection, id) => {
          if (!mockDb.collections[collection] || !mockDb.collections[collection][id]) {
            return Promise.resolve(null);
          }
          return Promise.resolve(mockDb.collections[collection][id]);
        },
        
        // Busca documentos com filtros
        find: (collection, filters = {}) => {
          if (!mockDb.collections[collection]) {
            return Promise.resolve([]);
          }
          
          const items = Object.values(mockDb.collections[collection]);
          
          // Filtra os itens baseado nos filtros fornecidos
          const filtered = items.filter(item => {
            // Se não há filtros, retorna todos os itens
            if (Object.keys(filters).length === 0) {
              return true;
            }
            
            // Verifica se o item satisfaz todos os critérios de filtro
            return Object.entries(filters).every(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                if (value.operator === '<=' && item[key] <= value.value) return true;
                if (value.operator === '>=' && item[key] >= value.value) return true;
                if (value.operator === '<' && item[key] < value.value) return true;
                if (value.operator === '>' && item[key] > value.value) return true;
                if (value.operator === '==' && item[key] == value.value) return true;
                return false;
              }
              return item[key] === value;
            });
          });
          
          return Promise.resolve(filtered);
        },
        
        // Retorna todos os documentos de uma coleção
        findAll: (collection) => {
          if (!mockDb.collections[collection]) {
            return Promise.resolve([]);
          }
          return Promise.resolve(Object.values(mockDb.collections[collection]));
        },
        
        // Atualiza um documento
        update: (collection, id, data) => {
          if (!mockDb.collections[collection] || !mockDb.collections[collection][id]) {
            return Promise.resolve(false);
          }
          mockDb.collections[collection][id] = { ...mockDb.collections[collection][id], ...data };
          return Promise.resolve(true);
        },
        
        // Remove um documento
        delete: (collection, id) => {
          if (!mockDb.collections[collection] || !mockDb.collections[collection][id]) {
            return Promise.resolve(false);
          }
          delete mockDb.collections[collection][id];
          return Promise.resolve(true);
        },
        
        // Transações simuladas
        beginTransaction: () => Promise.resolve({ mockTransaction: true }),
        commitTransaction: () => Promise.resolve(),
        rollbackTransaction: () => Promise.resolve()
      };
      
      // Define o provedor para o mock
      databaseFactory.setProvider(mockProvider);
      
      return { 
        dbType: 'firebase-mock',
        dbProvider: mockProvider
      };
    } catch (mockError) {
      console.error('Erro ao criar mock para testes:', mockError);
      return {
        dbType: 'none',
        dbProvider: null
      };
    }
  }
}

/**
 * Limpa o banco de dados de testes
 * @param {string} dbType - Tipo do banco ('mysql' ou 'firebase')
 * @param {Object} pool - Pool de conexões MySQL (opcional)
 */
async function clearTestDatabase(dbType, pool) {
  if (dbType === 'mysql' && pool) {
    try {
      const connection = await pool.getConnection();
      try {
        // Desabilita verificação de chaves estrangeiras temporariamente
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        
        // Obtém todas as tabelas do banco de dados
        const [tables] = await connection.execute(`
          SELECT TABLE_NAME
          FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_SCHEMA = ?`, [dbConfig.database]);
        
        // Limpa cada tabela
        for(const table of tables) {
          const tableName = table.TABLE_NAME;
          await connection.execute(`TRUNCATE TABLE ${tableName}`);
        }
        
        // Reabilita verificação de chaves estrangeiras
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Erro ao limpar o banco de dados:', error);
    }
  } else if (dbType === 'firebase-mock') {
    // Para o mock, não precisamos fazer nada, pois ele é recriado a cada teste
    console.log('Mock do Firebase: limpeza não é necessária, o estado será reiniciado nos próximos testes');
  } else if (dbType === 'firebase') {
    // Para Firebase, não há uma maneira fácil de limpar tudo,
    // mas você pode implementar isso se necessário
    console.log('Limpeza do Firebase não implementada. Use mocks para testes isolados.');
  }
}

/**
 * Fecha as conexões com o banco de dados
 * @param {string} dbType - Tipo do banco ('mysql' ou 'firebase') 
 * @param {Object} pool - Pool de conexões MySQL (opcional)
 */
async function closeTestDatabase(dbType, pool) {
  if (dbType === 'mysql' && pool) {
    await pool.end();
  }
  // Para Firebase, não é necessário fazer nada
}

module.exports = {
  setupTestDatabase,
  clearTestDatabase,
  closeTestDatabase
};
