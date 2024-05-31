export class Store {
  constructor(options) {
    this.name = options.name || "default";
    this.defaults = options.defaults || {};
    this.migrations = options.migrations || {};
    this.serialize = options.serialize || JSON.stringify;
    this.data = this.loadInitialData();
    this.applyMigrations();
  }

  loadInitialData() {
    const storedValue = localStorage.getItem(this.name);
    if (storedValue !== null) {
      return JSON.parse(storedValue);
    }
    return { ...this.defaults, "__internal__": { "migrations": { "version": "0.0.0" } } };
  }

  applyMigrations() {
    const currentVersion = this.data.__internal__.migrations.version;
    const migrationKeys = Object.keys(this.migrations).sort();
    migrationKeys.forEach(version => {
      if (this.isNewerVersion(version, currentVersion)) {
        console.log(`Applying migration for version ${version}`);
        this.migrations[version](this);
        this.data.__internal__.migrations.version = version;
        this.save();
      }
    });
  }

  isNewerVersion(version, currentVersion) {
    const [major, minor, patch] = version.split('.').map(Number);
    const [currentMajor, currentMinor, currentPatch] = currentVersion.split('.').map(Number);
    return major > currentMajor || (major === currentMajor && minor > currentMinor) || (major === currentMajor && minor === currentMinor && patch > currentPatch);
  }

  get(key) {
    return key.split('.').reduce((acc, part) => acc && acc[part], this.data) || null;
  }

  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    const lastObj = keys.reduce((acc, part) => acc[part] = acc[part] || {}, this.data);
    lastObj[lastKey] = value;
    this.save();
  }

  delete(key) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    const lastObj = keys.reduce((acc, part) => acc[part] = acc[part] || {}, this.data);
    if (lastObj && lastObj[lastKey]) {
      delete lastObj[lastKey];
      this.save();
    }
  }

  clear() {
    this.data = { ...this.defaults, "__internal__": this.data.__internal__ };
    this.save();
  }

  has(key) {
    return this.get(key) !== null;
  }

  save() {
    localStorage.setItem(this.name, this.serialize(this.data));
  }
}
