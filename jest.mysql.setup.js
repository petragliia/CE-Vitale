const { setupTestDatabase, clearTestDatabase, closeTestDatabase } = require('./src/config/testConfig');

// Armazenar configurações de teste globais
let testDbConfig = {};

// Inicializa o banco de dados antes de todos os testes
beforeAll(async () => {
  // Detecta automaticamente o banco disponível e configura
  testDbConfig = await setupTestDatabase();
  
  // Exporta configurações para os testes
  global.dbProvider = testDbConfig.dbProvider;
  
  // Se for MySQL, expõe o pool também para compatibilidade
  if (testDbConfig.dbType === 'mysql') {
    global.dbPool = testDbConfig.dbPool;
  }
  
  console.log(`Configuração de testes usando: ${testDbConfig.dbType}`);
});

// Limpa o banco de dados após cada teste
afterEach(async () => {
  // Se estiver usando MySQL, limpa as tabelas
  await clearTestDatabase(testDbConfig.dbType, testDbConfig.dbPool);
});

// Fecha todas as conexões após todos os testes
afterAll(async () => {
  await closeTestDatabase(testDbConfig.dbType, testDbConfig.dbPool);
});
