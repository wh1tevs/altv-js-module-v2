// clang-format off
// clang-format off
const { esmLoader } = require("internal/process/esm_loader");
const { translators } = require("internal/modules/esm/translators");
const { ModuleWrap } = internalRequire("internal/test/binding").internalBinding("module_wrap");
const path = require("path");
const alt = __altModule;
const altShared = __altSharedModule;
const dns = require('dns');
const url = require("url");

(async () => {
  const resource = alt.Resource.current;
  let _exports = null;

  // We need this handler so that NodeJS doesn't
  // crash the process on oncaught exceptions
  process.on("uncaughtException", (err) => {
    alt.logError(`Uncaught exception: ${err.stack ? `${err.stack}` : `${err.message}`}`);
  });

  // Allows users to use "localhost" address instead of 127.0.0.1 for tcp connections (e.g. database)
  // https://github.com/nodejs/node/issues/40702#issuecomment-958157082
  dns.setDefaultResultOrder('ipv4first');

  try {
    setupImports();

    // Get the path to the main file for this resource, and load it
    const _path = path.resolve(resource.path, resource.main);
    _exports = await esmLoader.import(url.pathToFileURL(_path).toString(), "", {});
  } catch (e) {
    alt.logError(e);
  }

  __resourceStarted(_exports);
})();

// Sets up our custom way of importing alt:V resources
function setupImports() {
  const altModuleImportPrefix = "@altv";
  const altResourceImportPrefix = "@resource";
  const altModuleInternalPrefix = "altmodule";
  const altResourceInternalPrefix = "altresource";

  translators.set("altresource", async function(url) {
    const name = url.slice(altResourceInternalPrefix.length + 1); // Remove prefix
    const exports = alt.Resource.get(name).exports;
    return new ModuleWrap(url, undefined, Object.keys(exports), function() {
      for (const exportName in exports) {
        let value;
        try {
          value = exports[exportName];
        } catch {}
        this.setExport(exportName, value);
      }
    });
  });
  translators.set("altmodule", async function(url) {
    const name = url.slice(altModuleInternalPrefix.length + 1); // Remove prefix
    const exports = name === "server" ? alt : altShared;
    const exportKeys = Object.keys(exports);
    return new ModuleWrap(url, undefined, exportKeys, function() {
      for (const exportName in exports) {
        let value;
        try {
          value = exports[exportName];
        } catch {}
        this.setExport(exportName, value);
      }
    });
  });

  const _warningPackages = {
    "node-fetch": "Console hangs"
  };
  const customLoaders = [{
    exports: {
      resolve(specifier, context, defaultResolve) {
        if(specifier.startsWith(`${altResourceImportPrefix}/`))
          return {
            url: `${altResourceInternalPrefix}:${specifier.slice(altResourceImportPrefix.length + 1)}`,
            shortCircuit: true
          };

        if(specifier.startsWith(`${altModuleImportPrefix}/`))
          return {
            url: `${altModuleInternalPrefix}:${specifier.slice(altModuleImportPrefix.length + 1)}`,
            shortCircuit: true
          };

        if(_warningPackages.hasOwnProperty(specifier)) alt.logWarning(`Using the module "${specifier}" can cause problems. Reason: ${_warningPackages[specifier]}`);
        return defaultResolve(specifier, context, defaultResolve);
      },
      load(url, context, defaultLoad) {
        if(url.startsWith(`${altResourceInternalPrefix}:`))
          return {
            format: "altresource",
            source: null,
            shortCircuit: true
          };

        if(url.startsWith(`${altModuleInternalPrefix}:`)) {
          const name = url.slice(altModuleInternalPrefix.length + 1); // Remove prefix
          if(name !== "server" && name !== "shared") {
            alt.logError("Invalid alt:V module import:", name);
            return defaultLoad(url, context, defaultLoad);
          }
          return {
              format: "altmodule",
              source: null,
              shortCircuit: true
          };
        }
        return defaultLoad(url, context, defaultLoad);
      },
    }
  }];
  esmLoader.addCustomLoaders(customLoaders);
}

// ***** Utils

// Supresses the warning from NodeJS when importing "super-internal" modules,
// that the embedder isn't supposed to use
function internalRequire(id) {
  const __emitWarning = process.emitWarning;
  process.emitWarning = () => {};
  const result = require(id);
  process.emitWarning = __emitWarning;
  return result;
}
