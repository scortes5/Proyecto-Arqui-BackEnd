async function fibonacciRetry(fn, maxRetries = 5) {
  let fib1 = 1, fib2 = 1;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = fib1 * 1000;
      // console.log(`Reintentando en ${fib1}s... (intento ${attempt + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      [fib1, fib2] = [fib2, fib1 + fib2];
    }
  }
}

module.exports = { fibonacciRetry };