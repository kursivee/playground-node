import apollo from 'apollo-server'
const { ApolloServer, gql } = apollo
import redisSub from 'graphql-redis-subscriptions';
const { RedisPubSub } = redisSub
import Redis from 'ioredis';

const options = {
  host: "127.0.0.1",
  port: 6378,
  retryStrategy: times => {
    // reconnect after
    return Math.min(times * 50, 2000);
  }
};

const pubsub = new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options)
});

const SERVER_STATUS_UPDATE = 'server_status_update'

const typeDefs = gql`
  type Query {
    servers: [Server]
  }
  
  type Mutation {
      setServerStatus(id: ID!, outage: Boolean!): Boolean
    }
  
  type Server {
    id: ID!
    name: String!
    outage: Boolean
  }
  
  type Subscription {
    serverStatus(id: ID): Server
  }
`;

const servers = [
    {
        id: "1",
        name: "Server 1",
        outage: false
    },
    {
        id: "2",
        name: "Server 2",
        outage: false
    },
    {
        id: "3",
        name: "Server 3",
        outage: false
    },
    {
        id: "4",
        name: "Server 4",
        outage: false
    }
]

const resolvers = {
    Query: {
        servers: () => {
          return servers
        }
    },
    Mutation: {
        setServerStatus: (_, args) => {
            const server = servers.find(server => {
                return server.id === args.id
            })
            server.outage = args.outage
            pubsub.publish(`${SERVER_STATUS_UPDATE}${server.id}`, {
                serverStatus: server
            })
        }
    },
    Subscription: {
        serverStatus: {
            subscribe: (_, args) => pubsub.asyncIterator(`${SERVER_STATUS_UPDATE}${args.id}`)
        }
    },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({ typeDefs, resolvers });

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});