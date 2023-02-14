import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ENS} from '../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, getNamedAccounts} = hre;
  const {deploy, execute, log, read} = deployments;

  const {deployer} = await getNamedAccounts();

  const tldName = 'eth';
  const labelName = 'aragonid';
  const tldHash = ethers.utils.namehash(tldName);
  const labelHash = ethers.utils.id(labelName);
  const node = ethers.utils.namehash('aragonid.eth');

  const ownerHash = ethers.utils.id('owner');

  const ensAddress = await read('APMRegistryFactory', {from: deployer}, 'ens');

  const ens = (await ethers.getContractAt('ENS', ensAddress)) as ENS;
  const publicResolver = await ens.resolver(
    ethers.utils.namehash('resolver.eth')
  );

  const aragonID = await deploy('FIFSResolvingRegistrar', {
    from: deployer,
    args: [ensAddress, publicResolver, node],
    log: true,
  });

  log('Creating subdomain and assigning it to AragonID');
  await ens.setSubnodeOwner(tldHash, labelHash, aragonID.address);

  log('Assigning owner name');
  await execute(
    'FIFSResolvingRegistrar',
    {from: deployer, log: true, gasLimit: 5000000},
    'register',
    ownerHash,
    deployer
  );
};

export default func;

func.tags = ['AragonID'];

func.dependencies = ['APMRegistryFactory'];
