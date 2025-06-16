/**
 * Testes unitários para UserRepository usando mocks
 */
const UserRepository = require('../UserRepository');

// Mock do pool de conexões
const mockPool = {
  getConnection: jest.fn(),
  query: jest.fn(),
  execute: jest.fn()
};

// Mock da conexão
const mockConnection = {
  execute: jest.fn(),
  release: jest.fn()
};

// Mock do schema
jest.mock('../../db/schema', () => ({
  createTables: jest.fn().mockResolvedValue()
}));

describe('UserRepository', () => {
  let userRepository;
  
  beforeAll(async () => {
    userRepository = new UserRepository(mockPool);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.getConnection.mockResolvedValue(mockConnection);
  });
  
  test('deve criar um novo usuário', async () => {
    // Arrange
    const userData = {
      name: 'João Silva',
      email: 'joao@example.com'
    };
    
    const mockResult = {
      insertId: 1,
      affectedRows: 1
    };
    
    mockConnection.execute.mockResolvedValue([mockResult]);
    
    // Act
    const result = await userRepository.create(userData);
    
    // Assert
    expect(mockConnection.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      expect.arrayContaining([userData.name, userData.email])
    );
    expect(result).toHaveProperty('id', 1);
    expect(result.name).toBe(userData.name);
    expect(result.email).toBe(userData.email);
  });
  
  test('deve encontrar usuário por email', async () => {
    // Arrange
    const userData = {
      id: 1,
      name: 'Maria Souza',
      email: 'maria@example.com'
    };
    
    mockConnection.execute.mockResolvedValue([[userData]]);
    
    // Act
    const user = await userRepository.findByEmail(userData.email);
    
    // Assert
    expect(mockConnection.execute).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, name, email, created_at FROM users WHERE email = ?'),
      [userData.email]
    );
    expect(user).toEqual(userData);
  });
  
  test('deve retornar null quando usuário não existe', async () => {
    // Arrange
    mockConnection.execute.mockResolvedValue([[]]);
    
    // Act
    const user = await userRepository.findById(999);
    
    // Assert
    expect(mockConnection.execute).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, name, email, created_at FROM users WHERE id = ?'),
      [999]
    );
    expect(user).toBeNull();
  });
  
  test('deve atualizar um usuário existente', async () => {
    // Arrange
    const userId = 1;
    const updatedData = {
      name: 'Carlos Ferreira Junior',
      email: 'carlos.jr@example.com'
    };
    
    const mockResult = {
      affectedRows: 1
    };
    
    mockConnection.execute.mockResolvedValue([mockResult]);
    
    // Act
    const result = await userRepository.update(userId, updatedData);
    
    // Assert
    expect(mockConnection.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET'),
      expect.arrayContaining([updatedData.name, updatedData.email, userId])
    );
    expect(result).toBe(true);
  });
  
  test('deve excluir um usuário pelo id', async () => {
    // Arrange
    const userId = 1;
    const mockResult = {
      affectedRows: 1
    };
    
    mockConnection.execute.mockResolvedValue([mockResult]);
    
    // Act
    const result = await userRepository.delete(userId);
    
    // Assert
    expect(mockConnection.execute).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM users WHERE id = ?'),
      [userId]
    );
    expect(result).toBe(true);
  });
  
  test('deve listar todos os usuários', async () => {
    // Arrange
    const mockUsers = [
      { id: 1, name: 'User 1', email: 'user1@example.com' },
      { id: 2, name: 'User 2', email: 'user2@example.com' },
      { id: 3, name: 'User 3', email: 'user3@example.com' }
    ];
    
    mockConnection.execute.mockResolvedValue([mockUsers]);
    
    // Act
    const users = await userRepository.findAll();
    
    // Assert
    expect(mockConnection.execute).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, name, email, created_at FROM users')
    );
    expect(Array.isArray(users)).toBe(true);
    expect(users).toEqual(mockUsers);
    expect(users.length).toBe(3);
  });
});
