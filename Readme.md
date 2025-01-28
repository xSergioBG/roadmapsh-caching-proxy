# Caching Proxy Server 🔗

Este es un servidor proxy de caché basado en Express que actúa como intermediario entre los clientes y un servidor de origen, almacenando en caché las respuestas para optimizar el rendimiento y reducir la carga en el servidor de origen.

## Características

- Utiliza Express para gestionar las solicitudes HTTP.
- Implementa un sistema de caché en memoria con `Map`.
- Registra las solicitudes usando `morgan`.
- Permite configurar el puerto y la URL del servidor de origen mediante argumentos de línea de comandos.
- Opción para limpiar la caché al iniciar.

## Instalación

Asegúrate de tener Node.js instalado en tu sistema. Luego, instala las dependencias necesarias:

```sh
npm install
```

## Uso

Ejecuta el servidor con los siguientes argumentos:

```sh
node server.js --port <puerto> --origin <URL_ORIGEN>
```

### Opciones disponibles

| Opción          | Alias | Tipo     | Descripción                                                                |
| --------------- | ----- | -------- | -------------------------------------------------------------------------- |
| `--port`        | `-p`  | Número   | Especifica el puerto en el que se ejecutará el servidor.                   |
| `--origin`      | `-o`  | String   | Define la URL del servidor de origen desde donde se recuperarán los datos. |
| `--clear-cache` |       | Booleano | Borra la caché antes de iniciar el servidor.                               |

### Ejemplo de uso

```sh
node server.js --port 3000 --origin https://api.ejemplo.com
```

Para limpiar la caché antes de ejecutar el servidor:

```sh
node server.js --port 3000 --origin https://api.ejemplo.com --clear-cache
```

## Funcionamiento

1. Cuando el proxy recibe una solicitud, primero verifica si la respuesta está en la caché.
2. Si la respuesta está en caché, la devuelve inmediatamente con un encabezado `X-Cache: HIT`.
3. Si no está en caché, reenvía la solicitud al servidor de origen, almacena la respuesta en caché y la devuelve con `X-Cache: MISS`.

## Registro de Solicitudes

Se usa `morgan` para registrar todas las solicitudes entrantes en la consola.
