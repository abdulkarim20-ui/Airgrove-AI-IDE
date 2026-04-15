
const { spawn, exec } = require("child_process");
const { EventEmitter } = require("events");

class TerminalService extends EventEmitter {
    constructor() {
        super();
        this.process = null;
    }

    _kill(pid) {
        if (!pid) return;
        if (process.platform === 'win32') {
            try {
                exec(`taskkill /pid ${pid} /T /F`);
            } catch (e) {
                console.error("Failed to taskkill:", e);
            }
        } else {
            try {
                // Determine if negative pid works (group kill) or just kill
                process.kill(pid);
            } catch (e) { /* ignore */ }
        }
    }

    runCommand(cmd, args, cwd) {
        if (this.process) {
            if (this.process.pid) {
                this._kill(this.process.pid);
            }
            this.process = null;
        }

        // Ensure cwd exists
        if (!cwd) {
            cwd = process.cwd();
        }

        // Capture start time
        const startTime = Date.now();

        // Construct display command string (approximate)
        const fullCmd = `${cmd} ${args.join(' ')}`;

        // Emit in next tick so listeners can attach
        process.nextTick(() => {
            this.emit("output", `[Running] ${fullCmd}\n`);
        });

        console.log(`[TerminalService] Spawning: ${fullCmd} in ${cwd}`);

        this.process = spawn(cmd, args, { cwd, shell: true });

        this.process.stdout.on("data", data => {
            this.emit("output", data.toString());
        });

        this.process.stderr.on("data", data => {
            this.emit("output", data.toString());
        });

        this.process.on("close", code => {
            // Check if we manually nulled it (stopped)
            if (!this.process) return;

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(3);

            this.emit("output", `\n[Done] exited with code=${code} in ${duration} seconds\n`);
            this.emit("exit", code);
            this.process = null;
        });

        this.process.on("error", (err) => {
            this.emit("output", `Error: ${err.message}\n`);
        });
    }

    stop() {
        if (this.process) {
            console.log('[TerminalService] Stopping process...');
            const pid = this.process.pid;

            // Nullify first to prevent 'close' handler from emitting 'exited with code'
            // We want to emit our own stopped message.
            this.process = null;

            this._kill(pid);

            this.emit("output", `\n[Done] exited (stopped) \n`);
            // Also emit exit event so buttons update!
            this.emit("exit", null);
        }
    }
}

module.exports = { TerminalService };
