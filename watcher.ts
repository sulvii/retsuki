import { Watcher, type WatcherOptions } from "@slipher/watcher";

// @ts-expect-error
const watcherOptions: WatcherOptions = {
	srcPath: "./src",
	debug: true,
};

export const watcher = new Watcher(watcherOptions);
