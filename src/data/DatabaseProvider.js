/**
 * DatabaseProvider - Interface abstrata para acesso a dados
 * Esta classe define a interface que qualquer implementação de banco de dados deve seguir
 */
class DatabaseProvider {
  /**
   * Cria um novo registro
   * @param {string} collection - Nome da coleção/tabela
   * @param {Object} data - Dados a serem inseridos
   * @returns {Promise<Object>} - Objeto criado com ID
   */
  async create(collection, data) {
    throw new Error('Método create() não implementado');
  }

  /**
   * Busca um registro pelo ID
   * @param {string} collection - Nome da coleção/tabela
   * @param {string|number} id - ID do registro
   * @returns {Promise<Object|null>} - Registro encontrado ou null
   */
  async findById(collection, id) {
    throw new Error('Método findById() não implementado');
  }

  /**
   * Busca registros com base em filtros
   * @param {string} collection - Nome da coleção/tabela
   * @param {Object} filters - Filtros a serem aplicados
   * @returns {Promise<Array>} - Array de registros encontrados
   */
  async find(collection, filters = {}) {
    throw new Error('Método find() não implementado');
  }

  /**
   * Lista todos os registros de uma coleção/tabela
   * @param {string} collection - Nome da coleção/tabela
   * @returns {Promise<Array>} - Array com todos os registros
   */
  async findAll(collection) {
    throw new Error('Método findAll() não implementado');
  }

  /**
   * Atualiza um registro
   * @param {string} collection - Nome da coleção/tabela
   * @param {string|number} id - ID do registro
   * @param {Object} data - Dados para atualização
   * @returns {Promise<boolean>} - true se bem sucedido
   */
  async update(collection, id, data) {
    throw new Error('Método update() não implementado');
  }

  /**
   * Remove um registro
   * @param {string} collection - Nome da coleção/tabela
   * @param {string|number} id - ID do registro
   * @returns {Promise<boolean>} - true se bem sucedido
   */
  async delete(collection, id) {
    throw new Error('Método delete() não implementado');
  }
  
  /**
   * Inicia uma transação
   * @returns {Promise<Object>} - Objeto de transação
   */
  async beginTransaction() {
    throw new Error('Método beginTransaction() não implementado');
  }
  
  /**
   * Confirma uma transação
   * @param {Object} transaction - Objeto de transação
   * @returns {Promise<void>}
   */
  async commitTransaction(transaction) {
    throw new Error('Método commitTransaction() não implementado');
  }
  
  /**
   * Reverte uma transação
   * @param {Object} transaction - Objeto de transação
   * @returns {Promise<void>}
   */
  async rollbackTransaction(transaction) {
    throw new Error('Método rollbackTransaction() não implementado');
  }
}

// Exporta a classe usando CommonJS
module.exports = DatabaseProvider;
