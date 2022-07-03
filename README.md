## sequelize-inspector

Inspect sequelize's connection pool usage and query performance:

```ts
import SequelizeInspector from 'sequelize-inspector'

// ... setup sequelize and express

SequelizeInspector.init(express, sequelize)
```

Now open up `/sequelize` and you'll see this graph. 

Each "lane" represents a connection to the database, and rectangles are queries and transactions. Hover them to see more info.

![screenshot](/screenshot.png)

This is still in early development and is NOT a production feature!