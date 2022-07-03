## sequelize-inspector

Inspect sequelize's connection pool usage and query performance. This library inspects `sequelize` and shows the info on your `express` server.

### 1. Install
```js
npm install sequelize-inspector
```
### 2. Use
```ts
import SequelizeInspector from 'sequelize-inspector'

// ... setup sequelize and express

SequelizeInspector.init(app, sequelize)
```

### 3. Open
Start up your server, open up `/sequelize` and you'll see this graph. 

Each "lane" represents a connection to the database. Rectangles within it are queries and transactions. Hover them to see their details.

![screenshot](/screenshot.png)

This is still in early development and is NOT a production feature!