const FirebaseDatabaseProvider = require('./FirebaseDatabaseProvider');
const MySQLDatabaseProvider = require('./MySQLDatabaseProvider');

// Singleton para gerenciar a implementação atual do banco de dados
class DatabaseFactory {
  constructor() {
    this.provider = null;
    this.defaultType = 'firebase';
  }

  /**
   * Inicializa o provedor de banco de dados
   * @param {string} type - Tipo de banco de dados ('firebase' ou 'mysql')
   * @param {Object} options - Opções de configuração
   */
  initialize(type = this.defaultType, options = {}) {
    if (this.provider) {
      return;
    }

    switch (type.toLowerCase()) {
      case 'firebase':
        this.provider = new FirebaseDatabaseProvider();
        break;
      case 'mysql':
        if (!options.pool) {
          throw new Error('É necessário fornecer um pool de conexão MySQL');
        }
        this.provider = new MySQLDatabaseProvider(options.pool);
        break;
      default:
        throw new Error(`Tipo de banco de dados não suportado: ${type}`);
    }
  }

  /**
   * Define o provedor de banco de dados manualmente
   * Útil para testes com mocks
   * @param {DatabaseProvider} provider - Implementação do provedor
   */
  setProvider(provider) {
    this.provider = provider;
  }

  /**
   * Retorna o provedor de banco de dados atual
   * @returns {DatabaseProvider} - Provedor de banco de dados
   */
  getProvider() {
    if (!this.provider) {
      this.initialize();
    }
    return this.provider;
  }

  /**
   * Limpa o provedor atual (útil para testes)
   */
  reset() {
    this.provider = null;
  }
}

// Exporta uma instância singleton
const databaseFactory = new DatabaseFactory();
module.exports = databaseFactory;
