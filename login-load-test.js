// Prueba de carga del servicio de login: POST https://fakestoreapi.com/auth/login
//
// - Credenciales parametrizadas desde data/users.csv (columnas: user,passwd)
// - Carga constante de 25 peticiones por segundo (el requisito pide al menos 20 TPS)
// - Validaciones:
//     * tiempo de respuesta máximo permitido: 1,5 s (1500 ms)
//     * tasa de error menor al 3 % del total de peticiones
//
// Variables de entorno opcionales: BASE_URL, RATE (TPS), DURATION (ej. 3m)

import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';
import { SharedArray } from 'k6/data';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

const BASE_URL = __ENV.BASE_URL || 'https://fakestoreapi.com';
const RATE = parseInt(__ENV.RATE || '25');       // TPS objetivo (mínimo exigido: 20)
const DURATION = __ENV.DURATION || '3m';
const MAX_RESPONSE_MS = 1500;                     // 1,5 segundos

// Carga el CSV una sola vez y lo comparte entre todos los VUs.
const users = new SharedArray('usuarios', function () {
  return open('./data/users.csv')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(1)                                     // omite el encabezado "user,passwd"
    .map((line) => {
      const separator = line.indexOf(',');
      return {
        user: line.substring(0, separator),
        passwd: line.substring(separator + 1),
      };
    });
});

export const options = {
  scenarios: {
    login_load: {
      executor: 'constant-arrival-rate',          // fija los TPS sin depender de la latencia
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    // Tiempo de respuesta: el 95 % de las peticiones debe responder en menos de 1,5 s.
    http_req_duration: [`p(95)<${MAX_RESPONSE_MS}`],
    // Tasa de error aceptable: menor al 3 % del total.
    http_req_failed: ['rate<0.03'],
    // Todas las validaciones (status, token y tiempo) deben cumplirse en más del 97 %.
    checks: ['rate>0.97'],
    // Se debe alcanzar al menos 20 TPS.
    http_reqs: ['rate>=20'],
  },
};

export default function () {
  // Reparte los usuarios del CSV en orden rotativo.
  const user = users[exec.scenario.iterationInTest % users.length];

  const payload = JSON.stringify({
    username: user.user,
    password: user.passwd,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '60s',                               // equivale a --max-time 60 del curl
    tags: { name: 'login' },
  };

  const res = http.post(`${BASE_URL}/auth/login`, payload, params);

  check(res, {
    // El login responde 201 Created; se acepta tambien 200 por compatibilidad.
    'status es 200/201': (r) => r.status === 200 || r.status === 201,
    'respuesta contiene token': (r) => {
      try {
        return !!r.json('token');
      } catch (e) {
        return false;
      }
    },
    'tiempo de respuesta < 1.5 s': (r) => r.timings.duration < MAX_RESPONSE_MS,
  });
}

// Genera resumen en consola y archivos en la carpeta reports/.
export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
    'reports/summary.txt': textSummary(data, { indent: ' ', enableColors: false }),
    'reports/summary.json': JSON.stringify(data, null, 2),
  };
}
