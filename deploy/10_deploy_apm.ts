import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {
  ACL,
  APMRegistry,
  ENS,
  ENSSubdomainRegistrar,
  Kernel,
} from '../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, getNamedAccounts} = hre;
  const {execute, get, log, read} = deployments;

  const {deployer} = await getNamedAccounts();

  const tldName = 'eth';
  const labelName = 'aragonpm';
  const tldHash = ethers.utils.namehash(tldName);
  const labelHash = ethers.utils.id(labelName);

  const openTldName = 'aragonpm.eth';
  const openLabelName = 'open';
  const openTldHash = ethers.utils.namehash(openTldName);
  const openLabelHash = ethers.utils.id(openLabelName);

  const ANY_ENTITY = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF';
  const CREATE_REPO_ROLE = ethers.utils.id('CREATE_REPO_ROLE');

  const apmFactory = await get('APMRegistryFactory');
  const ensAddress = await read('APMRegistryFactory', {from: deployer}, 'ens');

  log('Creating subdomain and assigning it to APMRegistryFactory');
  const ens = (await ethers.getContractAt('ENS', ensAddress)) as ENS;
  await ens.setSubnodeOwner(tldHash, labelHash, apmFactory.address, {
    gasLimit: 700000,
  });

  // New APM instance
  const {events} = await execute(
    'APMRegistryFactory',
    {from: deployer, log: true, gasLimit: 9000000},
    'newAPM',
    tldHash,
    labelHash,
    deployer
  );

  const {apm: apmAddress} = events?.find(
    (event) => event.event == 'DeployAPM'
  ).args;
  log('APM:', apmAddress);

  const apm = (await ethers.getContractAt(
    'APMRegistry',
    apmAddress
  )) as APMRegistry;

  const registrar = await apm.registrar();
  const ensSubdomainRegistrar = (await ethers.getContractAt(
    'ENSSubdomainRegistrar',
    registrar
  )) as ENSSubdomainRegistrar;

  log('Creating open subdomain and assigning it to APMRegistryFactory');
  await ensSubdomainRegistrar.createName(openLabelHash, apmFactory.address, {
    gasLimit: 700000,
  });

  // New Open APM instance
  const {events: newApmEvents} = await execute(
    'APMRegistryFactory',
    {from: deployer, log: true, gasLimit: 9000000},
    'newAPM',
    openTldHash,
    openLabelHash,
    deployer
  );

  const {apm: openApmAddress} = newApmEvents?.find(
    (event) => event.event == 'DeployAPM'
  ).args;
  log('Open APM:', openApmAddress);

  const openApm = (await ethers.getContractAt(
    'APMRegistry',
    openApmAddress
  )) as APMRegistry;
  const openKernel = (await ethers.getContractAt(
    'Kernel',
    await openApm.kernel()
  )) as Kernel;
  const openAcl = (await ethers.getContractAt(
    'ACL',
    await openKernel.acl()
  )) as ACL;

  // Grant ANY_ADDRESS the CREATE_REPO_ROLE permission
  log('Create permission for ANY_ENTITY on CREATE_REPO_ROLE');
  await openAcl.grantPermission(ANY_ENTITY, openApmAddress, CREATE_REPO_ROLE, {
    gasLimit: 500000,
  });
};

export default func;

func.tags = ['APM'];

func.dependencies = ['APMRegistryFactory'];
