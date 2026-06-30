import si from 'systeminformation';
import { db } from '../db/index.js';
import cron from 'node-cron';

export const systemMonitorService = {
  intervalId: null as NodeJS.Timeout | null,
  cronJob: null as cron.ScheduledTask | null,

  async init() {
    console.log('📊 Starting system monitor...');
    
    // Collect metrics every 30 seconds
    this.intervalId = setInterval(() => this.collectMetrics(), 30000);
    
    // Initial collection
    await this.collectMetrics();
    
    console.log('✅ System monitor started');
  },

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    console.log('🛑 System monitor stopped');
  },

  async collectMetrics() {
    try {
      const [cpu, mem, disk, gpu] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.graphics().catch(() => null)
      ]);

      // Get CPU temperature
      let cpuTemp = null;
      try {
        const temp = await si.cpuTemperature();
        cpuTemp = temp.main || temp.cores?.[0] || null;
      } catch {}

      // Get GPU temperature
      let gpuTemp = null;
      if (gpu?.controllers?.length) {
        gpuTemp = gpu.controllers[0].temperatureGpu || null;
      }

      const metrics = {
        cpu_usage: cpu.currentLoad,
        memory_used: mem.active,
        memory_total: mem.total,
        disk_used: disk[0]?.used || 0,
        disk_total: disk[0]?.size || 0,
        gpu_usage: gpu?.controllers?.[0]?.utilizationGpu || null,
        gpu_temp: gpuTemp,
        cpu_temp: cpuTemp,
        created_at: Date.now()
      };

      const stmt = db.prepare(`
        INSERT INTO system_metrics (cpu_usage, memory_used, memory_total, disk_used, disk_total, gpu_usage, gpu_temp, cpu_temp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        metrics.cpu_usage,
        metrics.memory_used,
        metrics.memory_total,
        metrics.disk_used,
        metrics.disk_total,
        metrics.gpu_usage,
        metrics.gpu_temp,
        metrics.cpu_temp,
        metrics.created_at
      );

      // Clean old metrics (keep last 7 days)
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      db.prepare('DELETE FROM system_metrics WHERE created_at < ?').run(weekAgo);

    } catch (err) {
      console.error('Failed to collect system metrics:', err);
    }
  },

  async getCurrentMetrics() {
    try {
      const [cpu, mem, disk] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize()
      ]);

      return {
        cpu: {
          usage: cpu.currentLoad,
          cores: cpu.cpus.length
        },
        memory: {
          used: mem.active,
          total: mem.total,
          free: mem.free,
          percent: (mem.active / mem.total) * 100
        },
        disk: disk.map(d => ({
          mount: d.mount,
          used: d.used,
          total: d.size,
          percent: (d.used / d.size) * 100
        })),
        timestamp: Date.now()
      };
    } catch (err) {
      console.error('Failed to get current metrics:', err);
      return null;
    }
  },

  async getHistory(hours = 24) {
    const since = Date.now() - hours * 60 * 60 * 1000;
    const stmt = db.prepare(`
      SELECT * FROM system_metrics 
      WHERE created_at > ? 
      ORDER BY created_at ASC
    `);
    return stmt.all(since);
  }
};