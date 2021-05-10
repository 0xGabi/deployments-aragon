import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const aclBase = await deploy('ACL', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: true,
  });

  if (process.env.VERIFY) {
    await hre.tenderly.persistArtifacts({
      name: 'ACL',
      address: aclBase.address,
    });

    await hre.tenderly.verify({
      name: 'ACL',
      address: aclBase.address,
    });
  }
};

export default func;

func.tags = ['ACL'];
