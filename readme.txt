PRUEBA DE CARGA DEL SERVICIO DE LOGIN - FAKESTOREAPI (k6)
=========================================================

DESCRIPCION
-----------
Prueba de carga del servicio de login:
    POST https://fakestoreapi.com/auth/login
    Content-Type: application/json
    Body: {"username": "<user>", "password": "<passwd>"}

Las credenciales se parametrizan desde el archivo data/users.csv (columnas
user,passwd) y se reparten de forma rotativa entre las peticiones.

ESCENARIO
---------
  - Ejecutor: constant-arrival-rate
  - Carga: 25 peticiones por segundo (TPS) durante 3 minutos
    (el requisito exige alcanzar al menos 20 TPS; se usa 25 como margen)
  - Timeout por peticion: 60 s (equivale al --max-time 60 del curl)

VALIDACIONES (thresholds)
-------------------------
  - Tiempo de respuesta: el percentil 95 debe ser menor a 1,5 s (1500 ms).
    Ademas, cada peticion verifica individualmente "tiempo < 1.5 s" y el
    maximo observado queda en el resumen.
  - Tasa de error: menor al 3 % del total de peticiones (http_req_failed).
  - Checks (status 200/201, token en la respuesta, tiempo < 1.5 s): mas del 97 %.
    (el servicio de login responde 201 Created cuando la autenticacion es exitosa)
  - Rendimiento: al menos 20 peticiones por segundo (http_reqs).
Si algun threshold no se cumple, k6 termina con codigo de salida distinto de 0.

VERSIONES DE LAS TECNOLOGIAS
----------------------------
  - k6: v1.0.0 o superior (el script usa solo APIs estables de k6;
    el reporte HTML requiere k6 v0.49 o superior)
  - Sistema operativo: Windows 10/11, Linux o macOS
  - Conexion a internet (se consulta fakestoreapi.com y se descarga el modulo
    de resumen desde https://jslib.k6.io)
  - Version usada en la ejecucion del autor: k6 v2.4.0 (windows/amd64),
    Windows 11 (verificar la propia con "k6 version")

REQUISITOS PREVIOS: INSTALAR k6
-------------------------------
Windows (cualquiera de estas opciones):
    winget install k6 --source winget
    choco install k6
  o descargar el instalador .msi desde https://github.com/grafana/k6/releases
macOS:
    brew install k6
Linux (Debian/Ubuntu): seguir https://grafana.com/docs/k6/latest/set-up/install-k6/

Verificar la instalacion (cerrar y abrir de nuevo la terminal despues de instalar):
    k6 version

PASO A PASO PARA EJECUTAR
-------------------------
1. Clonar el repositorio y entrar a la carpeta:
       git clone https://github.com/Swatofgok/fakestore-login-k6.git
       cd fakestore-login-k6

2. Ejecucion basica (genera reports/summary.txt y reports/summary.json):
       k6 run login-load-test.js

3. Ejecucion con reporte HTML (recomendada, es la que se entrega):
   PowerShell (Windows):
       $env:K6_WEB_DASHBOARD="true"
       $env:K6_WEB_DASHBOARD_EXPORT="reports/report.html"
       k6 run login-load-test.js
   Linux / macOS / Git Bash:
       K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=reports/report.html k6 run login-load-test.js

4. Revisar los resultados en la carpeta reports/:
       reports/report.html      reporte visual (abrir en el navegador)
       reports/summary.txt      resumen de metricas y thresholds
       reports/summary.json     datos completos en JSON

5. Parametros opcionales (variables de entorno):
       RATE=30 DURATION=5m   -> otra carga y duracion
   Ejemplo en PowerShell:
       $env:RATE="30"; $env:DURATION="5m"; k6 run login-load-test.js

COMO LEER EL RESULTADO
----------------------
Al final de la ejecucion k6 marca cada threshold con un check verde (cumplido)
o una cruz roja (no cumplido):
    http_req_duration  p(95)<1500   tiempo de respuesta
    http_req_failed    rate<0.03    tasa de error menor al 3 %
    checks             rate>0.97    validaciones
    http_reqs          rate>=20     TPS alcanzados

ESTRUCTURA DEL PROYECTO
-----------------------
  login-load-test.js   Script de k6 (escenario, validaciones y reportes)
  data/users.csv       Usuarios y contrasenas parametrizados
  reports/             Reportes generados (HTML, TXT y JSON)
  readme.txt           Este archivo
  conclusiones.txt     Hallazgos y conclusiones

SOLUCION DE PROBLEMAS
---------------------
  - "k6 no se reconoce como comando": cerrar y abrir la terminal, o revisar que
    k6 este en el PATH.
  - Errores de conexion o timeouts: verificar acceso a internet / proxy.
  - Error al cargar jslib.k6.io: requiere internet; revisar firewall o proxy.
  - Muchos errores 429 o 5xx: el servicio publico puede limitar la tasa; ver
    conclusiones.txt.
