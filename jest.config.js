/**
 * Configuração do Jest para testes usando mockagem dos serviços de banco de dados
 */

module.exports = {
  verbose: true,
  testEnvironment: 'jsdom', // Alterado de 'node' para 'jsdom' para simular um navegador
  setupFilesAfterEnv: ['./jest.setup.js'],
  testMatch: ["**/src/**/__tests__/**/*.test.js"],
  // Mock dos módulos do Firebase que podem causar problemas
  moduleNameMapper: {
    '^firebase/(.*)$': '<rootDir>/src/mocks/firebaseMock.js',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js'
  },
  // Transformações necessárias para ES modules vs CommonJS
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  }
};
