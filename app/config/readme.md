### OpenTargets webapp config

Config files are organized in directories.
Directory structure:
 - default.json
 - custom.json (optional, overrides values in default.json)

 At build time, the files in all directories are crunched into one file config.json which is loaded when bootstrapping the app.
