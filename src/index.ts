import { Transaction as DBTransaction } from "sequelize/types";

const sequelizeInspectorPage = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/css/bootstrap.min.css" rel="stylesheet"
    integrity="sha384-0evHe/X+R7YkIZDRvuzKMRqM+OrBnVFBL6DOitfPri4tjfHxaWutUpFmBp4vmVor" crossorigin="anonymous">

  <title>Sequelize Inspector</title>
</head>

<body class="container-fluid">
  <div id="app">
    <h2 class="mb-3 mt-3">Benchmarker</h2>
    <button type="button" class="btn btn-primary" @click="refreshing = !refreshing">{{refreshing ? 'Pause' :
      'Resume'}}</button>
    <div v-if="events.connections.length > 0">
      <div style="overflow: scroll" ref="graph" class="p-3">
        <svg :height="rowHeight * (events.connections.length + 3)" :width="timeXRelative(totalDuration)">
          <g v-for="(connection, index) in events.connections">
            <rect :x="timeXAbsolute(connection.startTime)" :width="width(connection)" fill="whitesmoke" stroke="black"
              :y="index * rowHeight" :height="rowHeight" stroke-width="0.1"></rect>
            <rect v-for="transaction in connection.transactions" fill="#aae6cc" stroke="black" :x="timeXAbsolute(transaction.startTime)"
              stroke-width="0.1" :width="width(transaction)" :y="index * rowHeight"
              :height="rowHeight"></rect>
            <rect v-for="query in connection.queries" fill="#0d6efd" stroke="black" :x="timeXAbsolute(query.startTime)"
              :stroke-width="query == focusedQuery ? 3 : 1" :width="width(query)" :y="index * rowHeight + 5"
              :height="rowHeight - 10" @mouseenter="focus(query)" @mouseleave="focus(null)"></rect>
            
          </g>
          <g v-for="gridLine in gridLines">
            <line :x1="timeXAbsolute(gridLine.time)" :x2="timeXAbsolute(gridLine.time)" :y1="0"
              :y2="rowHeight * (events.connections.length + 3)" stroke="grey" stroke-dasharray="5,5">
            </line>
            <text :x="timeXAbsolute(gridLine.time) + 5" :y="rowHeight * (events.connections.length + 2)"
              fill="grey">{{gridLine.label}}</text>
          </g>
        </svg>
      </div>
      <hr>
      <h2>Queries</h2>
      <ul class="list-group">
        <li v-for="query in allQueries" @mouseenter="focus(query)" @mouseleave="focus(null)" class="list-group-item"
          :class="{ active: query == focusedQuery }">
          <code>[{{query.endTime - query.startTime}}ms] {{query.sql}}</code>
        </li>
      </ul>
    </div>
    <div v-else>
      <p>No data yet.</p>
    </div>
  </div>
  <script src="https://unpkg.com/vue@3"></script>
  <script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
  <script>
    const { createApp } = Vue

    createApp({
      mounted() {
        fetch("/sequelize/api/events")
          .then(response => response.json())
          .then(events => {
            this.events = events;
            this.$nextTick(() => {
              if (this.$refs.graph) {
                this.$refs.graph.scrollLeft += 10000000000000;
              }
            })
          })
        setInterval(() => {
          if (this.refreshing) {
            fetch("/sequelize/api/events")
              .then(response => response.json())
              .then(events => {
                this.events = events;
                this.$nextTick(() => {
                  if (this.$refs.graph) {
                    this.$refs.graph.scrollLeft += 10000000000000;
                  }
                })
              })
          }
        }, 3000)
      },
      data() {
        return {
          refreshing: true,
          rowHeight: 30,
          focusedQuery: null,
          events: {
            connections: []
          },
        }
      },
      computed: {
        start() {
          return this.events ? this.events.startTime : null;
        },
        totalDuration() {
          return this.events ? new Date().getTime() - this.start : null;
        },
        gridLines() {
          const lines = [];
          for (var i = 0; i < this.totalDuration; i += 500) {
            lines.push({ time: this.start + i, label: i + "ms" });
          }
          return lines;
        },
        allQueries() {
          return this.events.connections.flatMap(connection => {
            return connection.queries
          })
        }
      },
      methods: {
        width(timedEvent) {
          const endTime = timedEvent.endTime ? timedEvent.endTime : new Date().getTime();
          return this.timeXAbsolute(endTime) - this.timeXAbsolute(timedEvent.startTime);
        },
        timeXRelative(time) {
          return time / 2;
        },
        timeXAbsolute(timestamp) {
          if (timestamp) {
            return this.timeXRelative(timestamp - this.start)
          } else {
            return this.timeXRelative(this.totalDuration);
          }
        },
        focus(query) {
          this.focusedQuery = query
        }
      }
    }).mount('#app')
  </script>
</body>

</html>`;

function now() {
  return new Date().getTime();
}

class Query {
  constructor(
    public query: any,
    public sql?: string,
    public startTime: number = now(),
    public endTime?: number,
  ) {}
}

class Transaction {
  constructor(public startTime: number = now(), public endTime?: number) {}
}

class Connection {
  constructor(
    public id: string,
    public queries: Query[] = [],
    public transactions: Transaction[] = [],
    public startTime: number = now(),
    public endTime?: number
  ) {}
}

class Recording {
  constructor(
    public connections: Connection[] = [],
    public startTime?: number
  ) {}
}

const recording = new Recording();

function findOrCreateConnection(id: string): Connection {
  const existingConnection = recording.connections.find(
    (connection) => connection.id === id
  );
  if (existingConnection) {
    return existingConnection;
  } else {
    const connection = new Connection(id);
    recording.connections.push(connection);
    return connection;
  }
}

function findQuery(connectionId: string, query: any): Query | undefined {
  const queries = findOrCreateConnection(connectionId)!.queries;
  return queries.find(aQuery => aQuery.query === query);
}

function findLastTransaction(connectionId: string): Transaction | undefined {
  const connection = findOrCreateConnection(connectionId);
  if (connection) {
    const transactions = findOrCreateConnection(connectionId)!.transactions;
    return transactions[transactions.length - 1];
  }
}

function queryStarted(connectionId: string, query: any): void {
  findOrCreateConnection(connectionId)!.queries.push(new Query(query));
}

function connectionAcquired(id: string) {
  if (!recording.startTime) {
    recording.startTime = now();
  }
  findOrCreateConnection(id);
}

function queryEnded(connectionId: string, sql: string, query: any) {
  const existingQuery = findQuery(connectionId, query);
  if (existingQuery && !existingQuery.endTime) {
    existingQuery.endTime = now();
    existingQuery.sql = sql;
  }
}

function connectionReleased(id: string) {
  findOrCreateConnection(id)!.endTime = now();
}

function transactionStarted(connectionId: string) {
  const connection = findOrCreateConnection(connectionId);
  if (connection) {
    connection.transactions.push(new Transaction());
  }
}

function transactionEnded(connectionId: string) {
  const transaction = findLastTransaction(connectionId);
  if (transaction && !transaction.endTime) {
    transaction.endTime = now();
  }
}

function getRecording(): Recording {
  return recording;
}

const Recorder = {
  getRecording,
  queryStarted,
  connectionAcquired,
  queryEnded,
  connectionReleased,
  transactionStarted,
  transactionEnded,
};

function handleAfterConnect(connection: any): void {
  const connectionId = connection.processID;
  Recorder.connectionAcquired(connectionId);
}

function handleAfterDisconnect(connection: any): void {
  Recorder.connectionReleased(connection.processID);
}

function init(expressApp: any, sequelize: any): void {
  expressApp.get('/sequelize', (req: any, res: any) => {
    res.send(sequelizeInspectorPage);
  });

  expressApp.get('/sequelize/api/events', (req: any, res: any) => {
    res.send(Recorder.getRecording());
  });
  sequelize.addHook('afterConnect', handleAfterConnect);
  sequelize.addHook('afterDisconnect', handleAfterDisconnect);
  decorateAfter(
    sequelize,
    'transaction',
    (transactionPromise: Promise<DBTransaction>) => {
      transactionPromise.then((transaction: any) => {
        const connectionId = transaction.connection.processID;
        Recorder.transactionStarted(connectionId);
        transaction.afterCommit(() => Recorder.transactionEnded(connectionId));
      });
    }
  );
  sequelize.addHook('beforeQuery', (options: any, query: any) => {
    if (options.type !== 'DEFERRED') {
      Recorder.queryStarted(query.connection.processID, query.uuid);
    }
  });
  sequelize.addHook('afterQuery', (_: any, query: any) => {
    const transactionQueries = ['START TRANSACTION;', 'COMMIT;', 'ROLLBACK;'];
    if (!transactionQueries.includes(query.sql)) {
      Recorder.queryEnded(query.connection.processID, query.sql, query.uuid);
    }
  });
}

function decorateAfter(object: any, funcName: string, after: (_: any) => void) {
  object[`__${funcName}`] = object[funcName];
  object[funcName] = (...args: any[]) => {
    const result = object[`__${funcName}`](...args);
    after(result);
    return result;
  };
}

export default {
  init,
};
