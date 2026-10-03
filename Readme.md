# Caching Proxy

Proxy local de aprendizaje para recursos HTTP públicos. Basado en el [proyecto de caché de roadmap.sh](https://roadmap.sh/projects/caching-server).

## Instalación y arranque

Node.js 22 o posterior; utiliza `fetch` nativo.

```sh
git clone https://github.com/xSergioBG/roadmapsh-caching-proxy.git
cd roadmapsh-caching-proxy
npm ci
node server.js --port 3000 --origin https://dummyjson.com
```

Escucha únicamente en `127.0.0.1`. Por ejemplo, solicita `http://127.0.0.1:3000/products` dos veces y comprueba el encabezado `X-Cache: MISS` seguido de `HIT`.

## Comportamiento

- GET y HEAD; otros métodos devuelven 405.
- Se conserva el estado HTTP y el tipo de contenido del origen.
- Caché en memoria con duración local de 60 segundos y máximo de 1.000 entradas.
- Solo se almacenan respuestas GET de estado 200, hasta 1 MiB, sin cookies, Vary ni directivas private/no-store/no-cache.
- Los errores HTTP no se almacenan. Un fallo de conexión devuelve 502.
- Las peticiones con Authorization o Cookie se rechazan: este ejemplo solo sirve recursos públicos.
- Los redireccionamientos del origen se devuelven al cliente.
- Tiempo máximo de espera del origen: 10 segundos.

`--clear-cache` explica cómo vaciar la caché: reiniciar el proceso que sirve el proxy. Ejecutar un segundo proceso no borra la memoria del primero.

## Límites

Ejemplo educativo, sin persistencia, revalidación HTTP, coordinación distribuida ni administración remota. La caducidad local no implementa todas las directivas HTTP de frescura. El límite de 1 MiB determina qué se almacena; no limita el tamaño descargado de una respuesta. No está preparado para actuar como proxy público de producción.

## Pruebas

```sh
npm test
```

Las pruebas levantan servidores locales y controlan las respuestas del origen: MISS/HIT, filtros de caché, errores, caducidad, capacidad y métodos.
