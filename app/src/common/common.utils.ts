export const convertUnixTimestampToDate = (timestamp: number | any): Date => {
  return new Date(timestamp * 1000);
};

export const convertDateToUnixTimestamp = (date: Date): number => {
  return date.getTime() / 1000;
};
