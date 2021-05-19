import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy, get} = deployments;

  const {deployer} = await getNamedAccounts();

  const daoFactory = await get('DAOFactory');
  const ensAddress = await read('APMRegistryFactory', {from: deployer}, 'ens');
  const minimeFactory = await get('MiniMeTokenFactory');
  const aragonID = await get('FIFSResolvingRegistrar');

  const baseTemplate = await deploy('BaseTemplate', {
    from: deployer,
    args: [
      daoFactory.address,
      ensAddress,
      minimeFactory.address,
      aragonID.address
    ],
    log: true,
    deterministicDeployment: true,
  });

  if (process.env.VERIFY) {
    await hre.tenderly.persistArtifacts({
      name: 'BaseTemplate',
      address: baseTemplate.address,
    });

    await hre.tenderly.verify({
      name: 'BaseTemplate',
      address: baseTemplate.address,
    });
  }
};

export default func;

func.tags = ['BaseTemplate'];

func.dependencies = ['MiniMeTokenFactory', 'AragonID'];
