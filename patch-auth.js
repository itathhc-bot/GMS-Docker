const fs = require('fs');

let clientCode = fs.readFileSync('resources/js/api/client.ts', 'utf8');
clientCode = clientCode.replace('return memoryToken;', "return memoryToken || (typeof window !== 'undefined' ? window.localStorage.getItem('auth_token') : null);");
fs.writeFileSync('resources/js/api/client.ts', clientCode);

let authCode = fs.readFileSync('resources/js/hooks/useAuth.tsx', 'utf8');
authCode = authCode.replace('setUser(authUser);', "const token = (res.data && res.data.token) ? res.data.token : (res.data && res.data.data && res.data.data.token ? res.data.data.token : null);\n      if (token && typeof window !== 'undefined') window.localStorage.setItem('auth_token', token);\n      setUser(authUser);");
authCode = authCode.replace('setUser(null);', "setUser(null);\n      if (typeof window !== 'undefined') window.localStorage.removeItem('auth_token');");
fs.writeFileSync('resources/js/hooks/useAuth.tsx', authCode);

console.log("Patch complete!");
