import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const apmRepoBase = await deploy('Repo', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: true,
  });

  if (process.env.VERIFY) {
    await hre.tenderly.persistArtifacts({
      name: 'Repo',
      address: apmRepoBase.address,
    });

    await hre.tenderly.verify({
      name: 'Repo',
      address: apmRepoBase.address,
    });
  }
};

export default func;

func.tags = ['Repo'];
