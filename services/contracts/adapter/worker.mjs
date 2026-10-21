import {handleAdapterRequest} from './src/server.mjs';

export default {
  async fetch(request, env) {
    return handleAdapterRequest(request, env);
  },
};
