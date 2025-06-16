export function sanitize(obj: object | bigint) {
    return JSON.parse(JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  }