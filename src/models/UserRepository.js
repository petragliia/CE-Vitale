/**
 * Repositório para gerenciar usuários no banco de dados
 */
class UserRepository {
  constructor(dbPool) {
    this.dbPool = dbPool;
  }

  /**
   * Cria um novo usuário no banco de dados
   * @param {Object} userData - Dados do usuário
   * @param {string} userData.name - Nome do usuário
   * @param {string} userData.email - Email do usuário
   * @returns {Promise<Object>} Usuário criado com ID
   */
  async create(userData) {
    const { name, email } = userData;
    
    const connection = await this.dbPool.getConnection();
    try {
      const [result] = await connection.execute(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        [name, email]
      );
      
      return {
        id: result.insertId,
        name,
        email
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Busca um usuário pelo ID
   * @param {number} id - ID do usuário
   * @returns {Promise<Object|null>} Dados do usuário ou null se não encontrado
   */
  async findById(id) {
    const connection = await this.dbPool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT id, name, email, created_at FROM users WHERE id = ?',
        [id]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  /**
   * Busca um usuário pelo email
   * @param {string} email - Email do usuário
   * @returns {Promise<Object|null>} Dados do usuário ou null se não encontrado
   */
  async findByEmail(email) {
    const connection = await this.dbPool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT id, name, email, created_at FROM users WHERE email = ?',
        [email]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  /**
   * Lista todos os usuários
   * @returns {Promise<Array>} Lista de usuários
   */
  async findAll() {
    const connection = await this.dbPool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT id, name, email, created_at FROM users'
      );
      
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Atualiza um usuário existente
   * @param {number} id - ID do usuário
   * @param {Object} userData - Dados do usuário para atualizar
   * @returns {Promise<boolean>} true se atualizado com sucesso
   */
  async update(id, userData) {
    const { name, email } = userData;
    
    const connection = await this.dbPool.getConnection();
    try {
      const [result] = await connection.execute(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        [name, email, id]
      );
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Remove um usuário pelo ID
   * @param {number} id - ID do usuário
   * @returns {Promise<boolean>} true se removido com sucesso
   */
  async delete(id) {
    const connection = await this.dbPool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM users WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }
}

module.exports = UserRepository;
