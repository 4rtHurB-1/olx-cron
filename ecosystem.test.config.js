module.exports = {
  apps : [{
      "name": "olx-cron",
      "args": [
          "build/App.bundle.js"
      ],
      "script": "node",
      "env": {
          "ENV": "test"
      },
      "max_memory_restart": "200M",
      "node_args": [],
      "exec_interpreter": "none",
      "exec_mode": "fork",
      "log_file": "logs.log"
  }],
};
