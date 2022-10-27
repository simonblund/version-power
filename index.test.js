const maxVersion = require('./index.js');

test('branch minor bigger', () => {
    branchVersion = [1,3,1]
    mainVersion = [1,1,1]
    expect(maxVersion(branchVersion, mainVersion)).toBe("1.3.1");
  });

  test('branch major bigger', () => {
    branchVersion = [2,2,100]
    mainVersion = [1,1,1]
    expect(maxVersion(branchVersion, mainVersion)).toBe("2.2.1");
  });

test('main major bigger', () => {
    branchVersion = [2,2,100]
    mainVersion = [3,1,1]
    expect(maxVersion(branchVersion, mainVersion)).toBe("3.1.2");
  });

test('main minor bigger', () => {
    branchVersion = [2,2,100]
    mainVersion = [2,3,1]
    expect(maxVersion(branchVersion, mainVersion)).toBe("2.3.2");
  });