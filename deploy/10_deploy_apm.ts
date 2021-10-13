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
  await ens.setSubnodeOwner(tldHash, labelHash, apmFactory.address);

  // New APM instance
  const {events} = await execute(
    'APMRegistryFactory',
    {from: deployer, log: true},
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
  const kernel = (await ethers.getContractAt(
    'Kernel',
    await apm.kernel()
  )) as Kernel;
  const acl = (await ethers.getContractAt('ACL', await kernel.acl())) as ACL;

  const registrar = await apm.registrar();
  const ensSubdomainRegistrar = (await ethers.getContractAt(
    'ENSSubdomainRegistrar',
    registrar
  )) as ENSSubdomainRegistrar;

  log('Create permission for root account on CREATE_NAME_ROLE');
  await acl.grantPermission(
    deployer,
    registrar,
    await ensSubdomainRegistrar.CREATE_NAME_ROLE()
  );

  log('Creating open subdomain and assigning it to APMRegistryFactory');
  await ensSubdomainRegistrar.createName(openLabelHash, apmFactory.address, {
    gasLimit: 300000,
  });

  // New Open APM instance
  const {events: newApmEvents} = await execute(
    'APMRegistryFactory',
    {from: deployer, log: true},
    'newAPM',
    openTldHash,
    openLabelHash,
    deployer
  );

  const {apm: openApmAddress} = newApmEvents?.find(
    (event) => event.event == 'DeployAPM'
  ).args;
  log('Open APM:', openApmAddress);

  // Grant ANY_ADDRESS the CREATE_REPO_ROLE permission
  log('Create permission for ANY_ENTITY on CREATE_REPO_ROLE');
  await acl.grantPermission(ANY_ENTITY, openApmAddress, CREATE_REPO_ROLE, {
    gasLimit: 500000,
  });

  if (process.env.VERIFY) {
    await hre.tenderly.persistArtifacts(
      {
        name: 'APMRegistry',
        address: apmAddress,
      },
      {
        name: 'APMRegistry',
        address: openApmAddress,
      }
    );

    await hre.tenderly.verify(
      {
        name: 'APMRegistry',
        address: apmAddress,
      },
      {
        name: 'APMRegistry',
        address: openApmAddress,
      }
    );
  }
};

export default func;

func.tags = ['APM'];

func.dependencies = ['APMRegistryFactory'];
