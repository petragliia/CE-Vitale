/**
 * Mock do Firebase para testes
 * Este arquivo implementa um mock simples para o Firebase, permitindo
 * executar testes sem depender do Firebase real ou emulador
 */

// Mock do Firestore
const firestoreMock = {
  collection: (collectionName) => ({
    add: (data) => Promise.resolve({ id: `mock-id-${Date.now()}`, ...data }),
    doc: (id) => ({
      get: () => Promise.resolve({
        exists: true,
        id,
        data: () => ({ id, mockData: true })
      }),
      set: (data) => Promise.resolve({ id, ...data }),
      update: (data) => Promise.resolve(true),
      delete: () => Promise.resolve(true)
    }),
    where: () => ({
      get: () => Promise.resolve({
        docs: [],
        forEach: (callback) => {}
      })
    }),
    get: () => Promise.resolve({
      docs: [],
      forEach: (callback) => {}
    })
  })
};

// Mock do Firebase
const firebaseMock = {
  firestore: () => firestoreMock,
  apps: [],
  initializeApp: () => {
    console.log('Mock: Firebase inicializado');
    return {};
  }
};

// Mock para funções específicas do Firebase
const authMock = {
  getAuth: () => ({
    currentUser: null,
    onAuthStateChanged: (callback) => callback(null)
  }),
  setPersistence: () => Promise.resolve(),
  browserSessionPersistence: 'mock'
};

// Mock para Firestore
const firestoreFunctions = {
  getFirestore: () => firestoreMock,
  collection: (db, name) => firestoreMock.collection(name),
  doc: (db, path) => firestoreMock.collection('').doc(path),
  getDocs: () => Promise.resolve({
    docs: [],
    forEach: (callback) => {}
  }),
  getDoc: () => Promise.resolve({
    exists: () => true,
    data: () => ({ mockData: true })
  }),
  addDoc: (_, data) => Promise.resolve({ id: `mock-id-${Date.now()}`, ...data }),
  updateDoc: () => Promise.resolve(),
  deleteDoc: () => Promise.resolve(),
  query: () => ({ mockQuery: true }),
  where: () => ({ mockWhere: true }),
  orderBy: () => ({ mockOrderBy: true })
};

// Exporta mock para diferentes subpacotes do Firebase
module.exports = firebaseMock;
module.exports.default = firebaseMock;
module.exports.getFirestore = firestoreFunctions.getFirestore;
module.exports.collection = firestoreFunctions.collection;
module.exports.doc = firestoreFunctions.doc;
module.exports.getDoc = firestoreFunctions.getDoc;
module.exports.getDocs = firestoreFunctions.getDocs;
module.exports.addDoc = firestoreFunctions.addDoc;
module.exports.updateDoc = firestoreFunctions.updateDoc;
module.exports.deleteDoc = firestoreFunctions.deleteDoc;
module.exports.query = firestoreFunctions.query;
module.exports.where = firestoreFunctions.where;
module.exports.orderBy = firestoreFunctions.orderBy;
module.exports.getAuth = authMock.getAuth;
module.exports.setPersistence = authMock.setPersistence;
module.exports.browserSessionPersistence = authMock.browserSessionPersistence;
