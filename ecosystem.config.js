module.exports = {
  apps : [{
      "name": "olx-cron",
      "args": [
          "build/App.bundle.js"
      ],
      "script": "node",
      "max_memory_restart": "700M",
      "node_args": [],
      "exec_interpreter": "none",
      "exec_mode": "fork",
      "log_file": "logs.log"
  }],
};
