const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, 'logs');
    this.app = 'demo-ecom-app';
    this.ensureLogsDir();
  }

  // Ensure logs directory exists
  ensureLogsDir() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  // Get current date formatted as YYYY-MM-DD
  getDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  // Get current ISO timestamp
  getTimestamp() {
    return new Date().toISOString();
  }

  // Get log file path based on date
  getLogFilePath(date = null) {
    const dateStr = date || this.getDateString();
    return path.join(this.logsDir, `app-${dateStr}.log`);
  }

  // Create JSON log object
  createLogObject(level, message, user = null, srcIp = null, details = null) {
    const logObject = {
      timestamp: this.getTimestamp(),
      application: this.app,
      log_level: level,
      message: message,
      src_ip: srcIp || 'unknown',
      user: user || 'system',
      details: details || {}
    };
    return logObject;
  }

  // Write log to file (JSON format)
  writeLog(level, message, user = null, srcIp = null, details = null) {
    const logObject = this.createLogObject(level, message, user, srcIp, details);
    const logJson = JSON.stringify(logObject);

    const logFile = this.getLogFilePath();

    // Append to log file
    fs.appendFileSync(logFile, logJson + '\n', 'utf8');

    // Also log to console (formatted)
    this.logToConsole(logObject);
  }

  // Format and log to console
  logToConsole(logObject) {
    const timestamp = logObject.timestamp.substring(0, 19).replace('T', ' ');
    const level = logObject.log_level;
    const user = logObject.user;
    const message = logObject.message;
    const srcIp = logObject.src_ip;
    
    const formattedLog = `[${timestamp}] [${level}] APP: ${logObject.application} | USER: ${user} | IP: ${srcIp} | MSG: ${message}`;
    console.log(formattedLog);
  }

  // Log info level
  info(message, user = null, srcIp = null, details = null) {
    this.writeLog('INFO', message, user, srcIp, details);
  }

  // Log warning level
  warn(message, user = null, srcIp = null, details = null) {
    this.writeLog('WARN', message, user, srcIp, details);
  }

  // Log error level
  error(message, user = null, srcIp = null, details = null) {
    this.writeLog('ERROR', message, user, srcIp, details);
  }

  // Log success level
  success(message, user = null, srcIp = null, details = null) {
    this.writeLog('SUCCESS', message, user, srcIp, details);
  }

  // Log action level
  action(message, user = null, srcIp = null, details = null) {
    this.writeLog('ACTION', message, user, srcIp, details);
  }

  // Log user action
  userAction(username, action, srcIp = null, details = null) {
    const message = action;
    this.action(message, username, srcIp, details);
  }

  // Get all log files
  getLogFiles() {
    const files = fs.readdirSync(this.logsDir);
    return files.filter(file => file.startsWith('app-') && file.endsWith('.log'));
  }

  // Read log file content
  readLogFile(filename) {
    const filePath = path.join(this.logsDir, filename);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  }

  // Parse JSON logs from file
  parseJsonLogs(filename) {
    const content = this.readLogFile(filename);
    if (!content) return [];
    
    const logs = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      try {
        const logObj = JSON.parse(line);
        logs.push(logObj);
      } catch (e) {
        // Skip invalid JSON lines
      }
    });
    
    return logs;
  }

  // Get log statistics from JSON logs
  getLogStatistics(filename) {
    const logs = this.parseJsonLogs(filename);
    
    const stats = {
      total: logs.length,
      info: 0,
      success: 0,
      action: 0,
      warn: 0,
      error: 0,
      byLevel: {},
      byUser: {}
    };

    logs.forEach(log => {
      const level = log.log_level || 'UNKNOWN';
      stats[level.toLowerCase()] = (stats[level.toLowerCase()] || 0) + 1;
      
      if (!stats.byLevel[level]) {
        stats.byLevel[level] = 0;
      }
      stats.byLevel[level]++;

      const user = log.user || 'system';
      if (!stats.byUser[user]) {
        stats.byUser[user] = 0;
      }
      stats.byUser[user]++;
    });

    return stats;
  }

  // Get log file size
  getLogFileSize(filename) {
    const filePath = path.join(this.logsDir, filename);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return stats.size;
    }
    return 0;
  }
}

module.exports = new Logger();
