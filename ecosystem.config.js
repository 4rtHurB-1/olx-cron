module.exports = {
  apps : [{
      "name": "olx-cron",
      "cwd": "/home/arthurb/workspace/olx-cron",
      "args": [
          "build/App.bundle.js"
      ],
      "script": "node",
      "env": {
          "TEST_SHEETS": "true"
      },
      "max_memory_restart": "200M",
      "node_args": [],
      "exec_interpreter": "none",
      "exec_mode": "fork",
      "error_file": "/logs/err.log",
      "out_file": "/logs/out.log",
      "log_file": "/logs/combined.log"
  }],
};
