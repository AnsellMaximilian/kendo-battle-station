export type AppAPI = {
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  example: {
    exampleOne: () => Promise<string>;
    exampleTwo: () => Promise<number>;
  };
};
