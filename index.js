const fs = require('fs');
const readlineSync = require('readline-sync');
const colors = require('colors');

const {
  sendSol,
  generateRandomAddresses,
  getKeypairFromSeed,
  getKeypairFromPrivateKey,
  PublicKey,
  connection,
  LAMPORTS_PER_SOL,
  delay,
} = require('./src/solanaUtils');

const { displayHeader } = require('./src/displayUtils');

(async () => {
  displayHeader();
  const method = readlineSync.question(
    'Select input method (0 for seed phrase, 1 for private key): '
  );

  let seedPhrasesOrKeys;
  if (method === '0') {
    seedPhrasesOrKeys = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
    if (!Array.isArray(seedPhrasesOrKeys) || seedPhrasesOrKeys.length === 0) {
      throw new Error(
        colors.red('accounts.json is not set correctly or is empty')
      );
    }
  } else if (method === '1') {
    seedPhrasesOrKeys = JSON.parse(
      fs.readFileSync('privateKeys.json', 'utf-8')
    );
    if (!Array.isArray(seedPhrasesOrKeys) || seedPhrasesOrKeys.length === 0) {
      throw new Error(
        colors.red('privateKeys.json is not set correctly or is empty')
      );
    }
  } else {
    throw new Error(colors.red('Invalid input method selected'));
  }

  const defaultAddressCount = 100;
  const addressCountInput = readlineSync.question(
    `How many random addresses do you want to generate? (default is ${defaultAddressCount}): `
  );
  const addressCount = addressCountInput
    ? parseInt(addressCountInput, 10)
    : defaultAddressCount;

  if (isNaN(addressCount) || addressCount <= 0) {
    throw new Error(colors.red('Invalid number of addresses specified'));
  }

  let count = 1;
  
  const randomAddresses = generateRandomAddresses(addressCount);

  let rentExemptionAmount;
  try {
    rentExemptionAmount =
      (await connection.getMinimumBalanceForRentExemption(0)) /
      LAMPORTS_PER_SOL;
    console.log(
      colors.yellow(
        `Minimum balance required for rent exemption: ${rentExemptionAmount} SOL`
      )
    );
  } catch (error) {
    console.error(
      colors.red(
        'Failed to fetch minimum balance for rent exemption. Using default value.'
      )
    );
    rentExemptionAmount = 0.001;
  }

  const minAmount = 0.001;
  const maxAmount = 0.009;
  const generateRandomAmount = () => {
    return (Math.random() * (maxAmount - minAmount) + minAmount).toFixed(3);
  };

  const minDelay = 60000; // Minimum random delay 1 minute
  const maxDelay = 120000; // Maximum random delay 2 minutes
  const generateRandomDelay = () => {
    return Math.floor(Math.random() * (maxDelay - minDelay) + minDelay);
  };
  
  for (const [index, seedOrKey] of seedPhrasesOrKeys.entries()) {
    let fromKeypair;
    if (method === '0') {
      fromKeypair = await getKeypairFromSeed(seedOrKey);
    } else {
      fromKeypair = getKeypairFromPrivateKey(seedOrKey);
    }
    console.log(
      colors.yellow(
        `Sending SOL from account ${
          index + 1
        }: ${fromKeypair.publicKey.toString()}`
      )
    );

    for (const address of randomAddresses) {
      const toPublicKey = new PublicKey(address);
      try {
        const amountToSend = generateRandomAmount();
        await sendSol(fromKeypair, toPublicKey, amountToSend);
        console.log(
          colors.green(`Successfully sent ${amountToSend} SOL to ${address}`)
        );
        console.log(colors.green(`Transaction ${count}/${addressCount} done`));
        count++;
      } catch (error) {
        console.error(colors.red(`Failed to send SOL to ${address}:`), error);
      }
      const delayBetweenTx = generateRandomDelay();
      console.log(`Waiting ${delayBetweenTx/1000} seconds`);
      await delay(delayBetweenTx);
    }
  }
})();
