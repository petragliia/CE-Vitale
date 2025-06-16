const DatabaseProvider = require('./DatabaseProvider');

/**
 * Implementação MySQL do DatabaseProvider 
 * Usa o driver mysql2/promise para operações de banco de dados
 */
class MySQLDatabaseProvider extends DatabaseProvider {
  /**
   * @param {Object} pool - Pool de conexões MySQL
   */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  /**
   * Cria um novo registro no MySQL
   * @param {string} table - Nome da tabela
   * @param {Object} data - Dados a serem inseridos
   * @returns {Promise<Object>} - Objeto criado com ID
   */
  async create(table, data) {
    const connection = await this.pool.getConnection();
    try {
      // Construir a query de inserção dinamicamente
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      
      const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
      
      const [result] = await connection.execute(query, values);
      
      return {
        id: result.insertId,
        ...data
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Busca um registro pelo ID no MySQL
   * @param {string} table - Nome da tabela
   * @param {number} id - ID do registro
   * @returns {Promise<Object|null>} - Registro encontrado ou null
   */
  async findById(table, id) {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${table} WHERE id = ?`,
        [id]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  /**
   * Busca registros com base em filtros no MySQL
   * @param {string} table - Nome da tabela
   * @param {Object} filters - Filtros a serem aplicados
   * @returns {Promise<Array>} - Array de registros encontrados
   */
  async find(table, filters = {}) {
    const connection = await this.pool.getConnection();
    try {
      // Se não houver filtros, retornar todos os registros
      if (Object.keys(filters).length === 0) {
        return this.findAll(table);
      }
      
      // Construir a cláusula WHERE dinamicamente
      const filterEntries = Object.entries(filters);
      const whereClauses = filterEntries.map(([key]) => `${key} = ?`).join(' AND ');
      const values = filterEntries.map(([_, value]) => value);
      
      const query = `SELECT * FROM ${table} WHERE ${whereClauses}`;
      
      const [rows] = await connection.execute(query, values);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Lista todos os registros de uma tabela no MySQL
   * @param {string} table - Nome da tabela
   * @returns {Promise<Array>} - Array com todos os registros
   */
  async findAll(table) {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(`SELECT * FROM ${table}`);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Atualiza um registro no MySQL
   * @param {string} table - Nome da tabela
   * @param {number} id - ID do registro
   * @param {Object} data - Dados para atualização
   * @returns {Promise<boolean>} - true se bem sucedido
   */
  async update(table, id, data) {
    const connection = await this.pool.getConnection();
    try {
      // Construir a query de atualização dinamicamente
      const setClause = Object.keys(data)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = [...Object.values(data), id];
      
      const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
      
      const [result] = await connection.execute(query, values);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Remove um registro no MySQL
   * @param {string} table - Nome da tabela
   * @param {number} id - ID do registro
   * @returns {Promise<boolean>} - true se bem sucedido
   */
  async delete(table, id) {
    const connection = await this.pool.getConnection();
    try {
      const [result] = await connection.execute(
        `DELETE FROM ${table} WHERE id = ?`,
        [id]
      );
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Inicia uma transação no MySQL
   * @returns {Promise<Object>} - Objeto de conexão com a transação
   */
  async beginTransaction() {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    return connection;
  }
  
  /**
   * Confirma uma transação no MySQL
   * @param {Object} connection - Conexão com a transação ativa
   * @returns {Promise<void>}
   */
  async commitTransaction(connection) {
    try {
      await connection.commit();
    } finally {
      connection.release();
    }
  }
  
  /**
   * Reverte uma transação no MySQL
   * @param {Object} connection - Conexão com a transação ativa
   * @returns {Promise<void>}
   */
  async rollbackTransaction(connection) {
    try {
      await connection.rollback();
    } finally {
      connection.release();
    }
  }
  
  /**
   * Executa uma query SQL personalizada
   * @param {string} query - Query SQL
   * @param {Array} params - Parâmetros da query
   * @returns {Promise<Array>} - Resultados da query
   */
  async executeRawQuery(query, params = []) {
    const connection = await this.pool.getConnection();
    try {
      const [results] = await connection.execute(query, params);
      return results;
    } finally {
      connection.release();
    }
  }
}

module.exports = MySQLDatabaseProvider;
