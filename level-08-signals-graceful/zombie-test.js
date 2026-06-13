// zombie-test.js - 第8关：演示僵尸进程问题
//
// 僵尸进程（Zombie Process）：
//   子进程已退出，但父进程未调用 wait() 回收其退出状态
//   僵尸进程不占用内存/CPU，但占用 PID 号
//   大量僵尸进程会耗尽 PID 上限，导致无法创建新进程
//
// 用法：node zombie-test.js
// 然后在另一个终端运行：docker top <容器名> 查看僵尸进程

const { spawn } = require('child_process');

console.log(`主进程 PID: ${process.pid}`);

// 每隔 2 秒创建一个子进程
// 子进程立即退出，但父进程不 wait()
// 如果 PID 1 不是 tini（init 进程），这些子进程会变成僵尸
let count = 0;
setInterval(() => {
  count++;
  // 创建并立即退出的子进程
  const child = spawn('echo', [`子进程 #${count}`]);
  child.stdout.on('data', (data) => {
    console.log(`输出: ${data.toString().trim()}`);
  });

  // ⚠️ 没有调用 child.on('exit') 来 wait —— 导致僵尸进程！
  // 正确做法：
  // child.on('exit', (code) => {
  //   console.log(`子进程 #${count} 退出，状态码: ${code}`);
  // });

  console.log(`创建了 ${count} 个子进程`);
}, 2000);

// 验证僵尸进程：
// 在宿主机运行：
// docker exec <容器名> ps aux | grep defunct
// 如果看到 [echo] <defunct>，说明有僵尸进程

console.log('僵尸进程演示启动，每 2 秒创建一个子进程');
console.log('通过 docker exec <容器名> ps aux | grep defunct 查看僵尸进程');
