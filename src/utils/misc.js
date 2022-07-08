const awaitTimeout = (delay, onTimeoutExpiredError) => (
  new Promise((resolve, reject) =>
    setTimeout(
      () => (onTimeoutExpiredError === undefined ? resolve() : reject(onTimeoutExpiredError)),
      delay
    )
  )
)

const wrapPromise = (promise, delay, onTimeoutExpiredError) => (
  Promise.race([promise, awaitTimeout(delay, onTimeoutExpiredError)])
)

const sleep = (ms) => (
  new Promise((resolve) => { setTimeout(resolve, ms) })
)

module.exports = {
  awaitTimeout, wrapPromise, sleep
}