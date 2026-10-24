interface Entry {
  readonly key: number;
  readonly cost: number;
  readonly order: number;
}

/** A small stable minimum queue for the path search: equal costs come out in the order they went in. */
export class MinQueue {
  private readonly items: Entry[] = [];
  private serial = 0;

  push(key: number, cost: number): void {
    const item = { key, cost, order: this.serial++ };
    this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      const above = this.items[parent] as Entry;
      if (!before(item, above)) break;
      this.items[i] = above;
      i = parent;
    }
    this.items[i] = item;
  }

  pop(): { readonly key: number; readonly cost: number } | undefined {
    const first = this.items[0];
    const last = this.items.pop();
    if (!first || !last || this.items.length === 0) return first;
    let i = 0;
    while (i * 2 + 1 < this.items.length) {
      let child = i * 2 + 1;
      if (child + 1 < this.items.length && before(this.items[child + 1] as Entry, this.items[child] as Entry)) child++;
      const next = this.items[child] as Entry;
      if (!before(next, last)) break;
      this.items[i] = next;
      i = child;
    }
    this.items[i] = last;
    return first;
  }
}

const before = (a: Entry, b: Entry): boolean => a.cost < b.cost || (a.cost === b.cost && a.order < b.order);
