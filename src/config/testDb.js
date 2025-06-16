const mysql = require('mysql2/promise');

// Configuração de conexão para ambiente de teste
const dbConfig = {
  host: 'localhost',
  user: 'root', // Substituir pelo seu usuário
  password: '', // Substituir pela sua senha
  database: 'vitale_test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Cria pool de conexões
const pool = mysql.createPool(dbConfig);

// Função para inicializar o banco de dados de teste
async function initTestDatabase() {
  // Conexão temporária para criar o banco se não existir
  const tempPool = mysql.createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password
  });
  
  try {
    // Cria o banco de dados de teste se não existir
    await tempPool.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    
    // Fecha a conexão temporária
    await tempPool.end();
    
    // Retorna a pool do banco de testes
    return pool;
  } catch (error) {
    console.error('Erro ao inicializar o banco de dados de teste:', error);
    throw error;
  }
}

// Função para limpar todas as tabelas do banco de dados
async function clearDatabase() {
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
}

// Função para fechar todas as conexões
async function closeDatabase() {
  return pool.end();
}

module.exports = {
  pool,
  initTestDatabase,
  clearDatabase,
  closeDatabase
};
