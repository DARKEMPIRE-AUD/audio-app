module.exports = {
  apps: [
    {
      name: 'bot-1',
      script: 'bot.js',
      args: '0',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      exec_mode: 'fork',
      merge_logs: true,
      error_file: '/dev/null',
      out_file: '/dev/null',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512'
      }
    },
    {
      name: 'bot-2',
      script: 'bot.js',
      args: '1',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      exec_mode: 'fork',
      merge_logs: true,
      error_file: '/dev/null',
      out_file: '/dev/null',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512'
      }
    },
    {
      name: 'bot-3',
      script: 'bot.js',
      args: '2',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      exec_mode: 'fork',
      merge_logs: true,
      error_file: '/dev/null',
      out_file: '/dev/null',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512'
      }
    },
    {
      name: 'bot-4',
      script: 'bot.js',
      args: '3',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      exec_mode: 'fork',
      merge_logs: true,
      error_file: '/dev/null',
      out_file: '/dev/null',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512'
      }
    },
    {
      name: 'bot-5',
      script: 'bot.js',
      args: '4',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      exec_mode: 'fork',
      merge_logs: true,
      error_file: '/dev/null',
      out_file: '/dev/null',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512'
      }
    },
    {
      name: 'bot-6',
      script: 'bot.js',
      args: '5',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      exec_mode: 'fork',
      merge_logs: true,
      error_file: '/dev/null',
      out_file: '/dev/null',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512'
      }
    },
    {
      name: 'bot-7',
      script: 'bot.js',
      args: '6',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      exec_mode: 'fork',
      merge_logs: true,
      error_file: '/dev/null',
      out_file: '/dev/null',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512'
      }
    },
    {
      name: 'bot-8',
      script: 'bot.js',
      args: '7',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      exec_mode: 'fork',
      merge_logs: true,
      error_file: '/dev/null',
      out_file: '/dev/null',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512'
      }
    },
    {
      name: 'bot-9',
      script: 'bot.js',
      args: '8',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      exec_mode: 'fork',
      merge_logs: true,
      error_file: '/dev/null',
      out_file: '/dev/null',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512'
      }
    },
    {
      name: 'bot-10',
      script: 'bot.js',
      args: '9',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      exec_mode: 'fork',
      merge_logs: true,
      error_file: '/dev/null',
      out_file: '/dev/null',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512'
      }
    }
  ]
};