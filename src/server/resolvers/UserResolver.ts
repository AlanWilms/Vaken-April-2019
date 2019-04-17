import { Resolver, Query, Arg, Mutation, Args } from 'type-graphql';
import { plainToClass } from 'class-transformer';

import { User } from '../data/User';
import { UserModel } from '../models/User';
import UpdateUserInput from '../inputs/UpdateUserInput';

@Resolver(() => User)
class UserResolver {
	/**
	 * @param {string} email - email address of a particular user
	 * @returns {User} A User with the provided email
	 */
	@Query(() => User, {
		description: 'Return a single User corresponding to a known email address',
		nullable: true,
	})
	public static async user(@Arg('email') email: string): Promise<User | undefined> {
		const user = await UserModel.findOne({ email });
		if (!user) {
			return undefined;
		}
		const userObject = user.toObject();
		delete userObject._id;
		delete userObject.__v;
		delete userObject.password;
		return plainToClass(User, userObject as User);
	}

	/**
	 * @returns {[User]} All Users in the Vaken database
	 */
	@Query(() => [User], { description: 'Return all Users in the database' })
	public static async users(): Promise<User[]> {
		const users = await UserModel.find({});
		if (!users) {
			return [];
		}
		const userList: Record<string, any>[] = [];
		users.forEach(user => {
			const userObject = user.toObject();
			delete userObject._id;
			delete userObject.__v;
			delete userObject.password;
			userList.push(userObject);
		});
		return plainToClass(User, userList);
	}

	/**
	 * Updates a user.
	 *
	 * @param {string} email - The email address of the user to update
	 * @param {UpdateUserInput} data - Data to update the provided user (only desired fields)
	 * @throws an error if any of the Mongo calls fail
	 * @returns {Promise<boolean>} true if successful
	 *
	 */
	@Mutation(() => Boolean, {
		description: 'Update a User',
	})
	public static async updateUser(
		@Arg('email') email: string,
		@Arg('data', { nullable: true }) data: UpdateUserInput
	): Promise<boolean> {
		// Find the user to update
		const user = await UserModel.findOne({ email });

		// Throw an error if no user exists with the provided email address
		if (!user) {
			throw new Error('User does not exist!');
		}

		// Filter out any undefined data
		const filteredData: UpdateUserInput = {};
		Object.keys(data).forEach(key =>
			key !== undefined ? ((filteredData as any)[key] = (data as any)[key]) : ''
		);

		// Update the user
		try {
			await UserModel.updateOne({ _id: user._id }, { $set: filteredData });

			// Handle special case for a new nfcCode
			if (filteredData.newNfcCode) {
				await UserModel.updateOne(
					{ _id: user._id },
					{ $push: { nfcCodes: filteredData.newNfcCode } }
				);
			}
		} catch (err) {
			throw new Error('User could not be updated!');
		}

		// If successful, return true
		return true;
	}
}

export default UserResolver;

// Copyright (c) 2019 Vanderbilt University
