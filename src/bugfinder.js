// Substitui o console.log para registrar logs mais detalhados
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Array para armazenar logs
const logHistory = [];

// Função auxiliar para obter stack trace
function getStackTrace() {
  const error = new Error();
  return error.stack;
}

// Substitui console.error
console.error = function(...args) {
  const stack = getStackTrace();
  const timestamp = new Date().toISOString();
  const message = args.join(' ');
  const logEntry = {
    type: 'error',
    timestamp,
    message,
    stack: stack.split('\n').slice(2).join('\n') // Remove as primeiras 2 linhas que se referem a esta função
  };
  logHistory.push(logEntry);
  originalConsoleError.apply(console, args);
};

// Substitui console.warn
console.warn = function(...args) {
  const stack = getStackTrace();
  const timestamp = new Date().toISOString();
  const message = args.join(' ');
  const logEntry = {
    type: 'warning',
    timestamp,
    message,
    stack: stack.split('\n').slice(2).join('\n')
  };
  logHistory.push(logEntry);
  originalConsoleWarn.apply(console, args);
};

// Substitui console.log
console.log = function(...args) {
  const timestamp = new Date().toISOString();
  const message = args.join(' ');
  const logEntry = {
    type: 'log',
    timestamp,
    message
  };
  logHistory.push(logEntry);
  originalConsoleLog.apply(console, args);
};

// Registra erros não capturados
window.addEventListener('error', function(event) {
  const logEntry = {
    type: 'uncaughtError',
    timestamp: new Date().toISOString(),
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error ? event.error.stack : null
  };
  logHistory.push(logEntry);
});

// Registra promessas rejeitadas não tratadas
window.addEventListener('unhandledrejection', function(event) {
  const logEntry = {
    type: 'unhandledRejection',
    timestamp: new Date().toISOString(),
    message: event.reason ? (event.reason.message || event.reason.toString()) : 'Promessa rejeitada sem motivo definido',
    stack: event.reason && event.reason.stack ? event.reason.stack : null
  };
  logHistory.push(logEntry);
});

// Adiciona função global para exportar logs
window.exportLogs = function() {
  const logText = JSON.stringify(logHistory, null, 2);
  const blob = new Blob([logText], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Cria um link para download
  const a = document.createElement('a');
  a.href = url;
  a.download = `app-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('Logs exportados com sucesso!');
  return 'Logs exportados com sucesso!';
};
