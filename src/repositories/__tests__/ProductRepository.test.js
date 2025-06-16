const ProductRepository = require('../ProductRepository');
const { setupTestDatabase, clearTestDatabase, closeTestDatabase } = require('../../config/testConfig');

describe('ProductRepository', () => {
  let productRepository;
  let testDbConfig;
  
  // Configuração inicial antes de todos os testes
  beforeAll(async () => {
    // Usa a configuração automática
    testDbConfig = await setupTestDatabase();
    productRepository = new ProductRepository(testDbConfig.dbProvider);
    
    // Cria tabelas se estiver usando MySQL
    if (testDbConfig.dbType === 'mysql') {
      const connection = await testDbConfig.dbPool.getConnection();
      try {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            category VARCHAR(50),
            stock INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } finally {
        connection.release();
      }
    }
  });
  
  // Limpa o banco após cada teste
  afterEach(async () => {
    if (testDbConfig && testDbConfig.dbType) {
      await clearTestDatabase(testDbConfig.dbType, testDbConfig.dbPool);
    }
  });
  
  // Fecha conexões após todos os testes
  afterAll(async () => {
    if (testDbConfig && testDbConfig.dbType) {
      await closeTestDatabase(testDbConfig.dbType, testDbConfig.dbPool);
    }
  });
  
  // Testes que funcionam com qualquer implementação de banco
  
  test('deve criar um novo produto', async () => {
    // Arrange
    const productData = {
      name: 'Produto de Teste',
      description: 'Descrição do produto',
      price: 29.99,
      category: 'Testes',
      stock: 10
    };
    
    // Act
    const result = await productRepository.createProduct(productData);
    
    // Assert
    expect(result).toHaveProperty('id');
    expect(result.name).toBe(productData.name);
    
    // Verifica se o produto foi salvo no banco
    const savedProduct = await productRepository.findById(result.id);
    expect(savedProduct).not.toBeNull();
    expect(savedProduct.name).toBe(productData.name);
  });
  
  test('deve atualizar o estoque de um produto', async () => {
    // Arrange - cria um produto
    const product = await productRepository.createProduct({
      name: 'Produto com Estoque',
      price: 15.99,
      stock: 5
    });
    
    const newStock = 20;
    
    // Act - atualiza o estoque
    const result = await productRepository.updateStock(product.id, newStock);
    
    // Assert
    expect(result).toBe(true);
    
    // Verifica se o estoque foi atualizado
    const updatedProduct = await productRepository.findById(product.id);
    expect(updatedProduct.stock).toBe(newStock);
  });
  
  test('deve retornar null para produto inexistente', async () => {
    // Act
    const result = await productRepository.findById('id-inexistente');
    
    // Assert
    expect(result).toBeNull();
  });
  
  test('deve encontrar produtos por categoria', async () => {
    // Arrange - cria produtos com diferentes categorias
    await productRepository.createProduct({
      name: 'Produto Categoria A',
      price: 10.00,
      category: 'CategoriaA',
      stock: 5
    });
    
    await productRepository.createProduct({
      name: 'Produto Categoria B',
      price: 20.00,
      category: 'CategoriaB',
      stock: 10
    });
    
    await productRepository.createProduct({
      name: 'Outro Produto Categoria A',
      price: 15.00,
      category: 'CategoriaA',
      stock: 3
    });
    
    // Act
    const productsA = await productRepository.findByCategory('CategoriaA');
    
    // Assert
    expect(Array.isArray(productsA)).toBe(true);
    // Verifica se temos pelo menos 2 produtos, já que pode haver acumulação entre testes
    expect(productsA.length).toBeGreaterThanOrEqual(2);
    expect(productsA.every(p => p.category === 'CategoriaA')).toBe(true);
  });
  
  test('deve encontrar produtos com estoque baixo', async () => {
    // Arrange - cria produtos com diferentes níveis de estoque
    await productRepository.createProduct({
      name: 'Produto Estoque Alto',
      price: 10.00,
      stock: 20
    });
    
    await productRepository.createProduct({
      name: 'Produto Estoque Baixo 1',
      price: 15.00,
      stock: 3
    });
    
    await productRepository.createProduct({
      name: 'Produto Estoque Baixo 2',
      price: 12.50,
      stock: 2
    });
    
    // Act - threshold de 5
    const lowStockProducts = await productRepository.findLowStock(5);
    
    // Assert
    expect(Array.isArray(lowStockProducts)).toBe(true);
    // Verifica se temos pelo menos 2 produtos, já que pode haver acumulação entre testes
    expect(lowStockProducts.length).toBeGreaterThanOrEqual(2);
    expect(lowStockProducts.every(p => p.stock <= 5)).toBe(true);
  });
});
