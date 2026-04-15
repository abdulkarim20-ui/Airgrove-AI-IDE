/**
 * ServiceRegistry
 * A central container for all IDE services.
 * Distinguishes between 'global' (permanent) and 'workspace' (disposable) services.
 */
class ServiceRegistry {
    constructor() {
        this.services = new Map();
        console.log('[ServiceRegistry] Initialized');
    }

    /**
     * Register a service
     * @param {string} id - Unique identifier for the service
     * @param {object} instance - The service instance
     * @param {string} scope - 'global' or 'workspace'
     */
    register(id, instance, scope = 'global') {
        if (this.services.has(id)) {
            console.warn(`[ServiceRegistry] Service ${id} is already registered. Overwriting.`);
        }
        this.services.set(id, { instance, scope });
        console.log(`[ServiceRegistry] Registered ${scope} service: ${id}`);
        return instance;
    }

    /**
     * Get a service instance by ID
     * @param {string} id 
     */
    get(id) {
        const entry = this.services.get(id);
        return entry ? entry.instance : null;
    }

    /**
     * Dispose all services currently marked as 'workspace' scoped
     */
    async disposeWorkspaceServices() {
        console.log('[ServiceRegistry] Disposing workspace services...');
        for (const [id, entry] of this.services.entries()) {
            if (entry.scope === 'workspace') {
                if (typeof entry.instance.dispose === 'function') {
                    await entry.instance.dispose();
                }
                this.services.delete(id);
                console.log(`[ServiceRegistry] Disposed and removed: ${id}`);
            }
        }
    }
}

// Export a singleton instance
export const services = new ServiceRegistry();
